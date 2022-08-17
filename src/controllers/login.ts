import * as randToken from 'rand-token'
import { Context } from 'koa'
import { Controller, Ctx, Flow, Get, Post } from 'koa-ts-controllers'
import { DocumentType } from '@typegoose/typegoose'
import { User, UserModel, getOrCreateUser } from '@/models/user'
import { authenticate, getUserFromToken } from '@/middlewares/authenticate'
import { bot } from '@/helpers/telegram'
import { decode } from 'jsonwebtoken'
import { Markup as m } from 'telegraf'
import { sign, verifyAppleToken } from '@/helpers/jwt'
import { verifyTelegramPayload } from '@/helpers/verifyTelegramPayload'
import axios from 'axios'
import Facebook = require('facebook-node-sdk')
import { QrLoginModel } from '@/models/QrLoginModel'
import { v4 as uuid } from 'uuid'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const AppleAuth = require('apple-auth')

export const telegramLoginRequests = {} as {
  [index: string]: {
    user: User
    allowed?: boolean
  }
}

@Controller('/login')
export default class LoginController {
  @Post('/facebook')
  async facebook(@Ctx() ctx: Context) {
    const fbProfile: any = await getFBUser(ctx.request.body.accessToken)
    const { user } = await getOrCreateUser({
      name: fbProfile.name,

      email: fbProfile.email,
      facebookId: fbProfile.id,
    })
    return user.stripped(true)
  }

  @Post('/telegram')
  async telegram(@Ctx() ctx: Context) {
    const data = ctx.request.body
    // verify the data
    if (!verifyTelegramPayload(data)) {
      return ctx.throw(403)
    }

    const { user } = await getOrCreateUser({
      name: `${data.first_name}${data.last_name ? ` ${data.last_name}` : ''}`,
      telegramId: data.id,
    })
    return user.stripped(true)
  }

  @Post('/google')
  async google(@Ctx() ctx: Context) {
    const accessToken = ctx.request.body.accessToken

    const userData: any = (
      await axios(
        `https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=${accessToken}`
      )
    ).data

    const { user } = await getOrCreateUser({
      name: userData.name,

      email: userData.email,
    })
    return user.stripped(true)
  }

  @Post('/google-firebase')
  async googleFirebase(@Ctx() ctx: Context) {
    const accessToken = ctx.request.body.accessToken

    const userData: any = (
      await axios.get(`https://www.googleapis.com/oauth2/v3/userinfo`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
    ).data

    const { user } = await getOrCreateUser({
      name: userData.name,

      email: userData.email,
    })
    return user.stripped(true)
  }

  @Post('/anonymous')
  async anonymous() {
    const { user } = await getOrCreateUser({
      name: 'Anonymous user',
      anonymousToken: randToken.generate(16),
    })
    return user.stripped(true)
  }

  @Post('/apple')
  async apple(@Ctx() ctx: Context) {
    const appleAuth = new AppleAuth(
      {
        client_id:
          ctx.request.body.client && ctx.request.body.client === 'ios'
            ? 'com.todorant.app'
            : 'com.todorant.web',
        team_id: 'ACWP4F58HZ',
        key_id: 'M3N8Y594JS',
        redirect_uri: 'https://todorant.com/apple_login_result',
        scope: 'name email',
      },
      `${__dirname}/../../assets/AppleAuth.p8`
    )

    const response = await appleAuth.accessToken(ctx.request.body.code)
    const idToken = decode(response.id_token) as any

    const appleSubId = idToken.sub
    // Check if it is first request
    if (ctx.request.body.user) {
      const email = idToken.email
      const userJson =
        typeof ctx.request.body.user === 'string'
          ? JSON.parse(ctx.request.body.user)
          : ctx.request.body.user
      if (userJson.name) {
        if (userJson.name.firstName.includes('Optional')) {
          userJson.name.firstName = userJson.name.firstName
            .replace('Optional("', '')
            .replace('")', '')
        }
        if (userJson.name.lastName.includes('Optional')) {
          userJson.name.lastName = userJson.name.lastName
            .replace('Optional("', '')
            .replace('")', '')
        }
      }
      const name = userJson.name
        ? `${userJson.name.firstName}${
            userJson.name.lastName ? ` ${userJson.name.lastName}` : ''
          }`
        : undefined
      const params = {
        name: name || 'Unidentified Apple',
        appleSubId,
        email,
        delegateInviteToken: randToken.generate(16),
      } as any
      // Try to find this user
      let user = await UserModel.findOne({ appleSubId })
      if (user) {
        return user.stripped(true)
      }
      user = (await new UserModel({
        ...params,
        token: await sign(params),
      }).save()) as DocumentType<User>
      return user.stripped(true)
    } else {
      let user = await UserModel.findOne({ appleSubId })
      if (!user) {
        const params = {
          name: 'Unidentified Apple',
          appleSubId,
        } as any
        user = (await new UserModel({
          ...params,
          token: await sign(params),
        }).save()) as DocumentType<User>
      }
      return user.stripped(true)
    }
  }

  @Post('/apple-firebase')
  async appleFirebase(@Ctx() ctx: Context) {
    const idToken = (await verifyAppleToken(
      ctx.request.body.credential.oauthIdToken,
      'com.todorant.web'
    )) as any

    const appleSubId = idToken.sub
    const email = idToken.email
    let name = 'Unidentified Apple'
    try {
      name =
        ctx.request.body.name ||
        ctx.request.body.user.providerData[0].displayName ||
        'Unidentified Apple'
    } catch {
      // Do nothing
    }

    let user = await UserModel.findOne({ appleSubId })
    if (user) {
      return user.stripped(true)
    }
    const params = {
      name,
      email,
      appleSubId,
      delegateInviteToken: randToken.generate(16),
    } as any
    user = (await new UserModel({
      ...params,
      token: await sign(params),
    }).save()) as DocumentType<User>

    return user.stripped(true)
  }

  @Post('/telegram_mobile')
  async telegramMobile(@Ctx() ctx: Context) {
    const { uuid, id } = ctx.request.body as {
      uuid: string
      id?: string
    }
    if (!uuid || !id) {
      return ctx.throw(403, 'Invalid request')
    }
    try {
      const telegramUser = await bot.telegram.getChat(id)
      if (telegramUser.type !== 'private') {
        throw new Error('Chat is not private')
      }

      const { user } = await getOrCreateUser({
        name: `${telegramUser.first_name}${
          telegramUser.last_name ? ` ${telegramUser.last_name}` : ''
        }`,
        telegramId: `${telegramUser.id}`,
      })
      const dbuser = user
      await bot.telegram.sendMessage(
        id,
        user.telegramLanguage === 'ru'
          ? 'Кто-то пытается зайти через ваш Телеграм в Тудурант. Не нажимайте "Разрешить", если это не вы!'
          : 'Somebody wants to login to your account on Todorant. Do no press "Allow" if it wasn\'t you!',
        {
          reply_markup: m.inlineKeyboard([
            m.callbackButton(
              user.telegramLanguage === 'ru' ? 'Разрешить' : 'Allow',
              `lta~${uuid}`
            ),
            m.callbackButton(
              user.telegramLanguage === 'ru' ? 'Запретить' : 'Reject',
              `ltr~${uuid}`
            ),
          ]),
        }
      )
      telegramLoginRequests[uuid] = {
        user: dbuser.stripped(true) as User,
      }
      return
    } catch (err) {
      return ctx.throw(404, 'Cannot send message')
    }
  }

  @Post('/telegram_mobile_check')
  async telegramMobileCheck(@Ctx() ctx: Context) {
    const { uuid } = ctx.request.body as {
      uuid: string
    }
    if (!uuid) {
      return ctx.throw(403, 'Invalid request')
    }
    try {
      const result = telegramLoginRequests[uuid]
      if (!result) {
        return ctx.throw(404, 'No request found')
      }
      return {
        allowed: result.allowed,
        user: result.allowed ? result.user : undefined,
      }
    } catch (err) {
      return ctx.throw(new Error())
    }
  }

  @Post('/token')
  async token(@Ctx() ctx: Context) {
    const token = ctx.request.body.token
    if (!token) {
      return ctx.throw(403)
    }
    const user = await getUserFromToken(token)
    return user.stripped(true)
  }

  @Post('/apple_login_result')
  async appleLoginResult(@Ctx() ctx: Context) {
    const { id_token, user } = ctx.request.body
    const userArg = user ? `&user=${JSON.stringify(user)}` : ''
    ctx.redirect(
      `https://todorant.com/#/apple_login_result#?id_token=${id_token}${userArg}`
    )
    return 'Success!'
  }

  @Get('/generate_uuid')
  async generateQrUuid() {
    const qrUuid = uuid()
    await new QrLoginModel({ uuid: qrUuid }).save()
    return { uuid: qrUuid }
  }

  @Post('/qr_token')
  @Flow(authenticate)
  async setQrToken(@Ctx() ctx: Context) {
    const qrUuid = ctx.request.body.uuid
    const token = ctx.headers.token
    if (!qrUuid || !token) {
      return ctx.throw(403)
    }
    await QrLoginModel.findOneAndUpdate({ uuid: qrUuid }, { token })
    ctx.status = 200
  }

  @Post('/qr_check')
  async checkQrLogin(@Ctx() ctx: Context) {
    const qrUuid = ctx.request.body.uuid
    if (!qrUuid) {
      return ctx.throw(403)
    }
    const token = (await QrLoginModel.findOne({ uuid: qrUuid })).token
    return { token }
  }
}

bot.action(/lta~.+/, async (ctx) => {
  await ctx.deleteMessage()
  telegramLoginRequests[ctx.callbackQuery.data.replace('lta~', '')].allowed =
    true
})

bot.action(/ltr~.+/, async (ctx) => {
  await ctx.deleteMessage()
  telegramLoginRequests[ctx.callbackQuery.data.replace('ltr~', '')].allowed =
    false
})

function getFBUser(accessToken: string) {
  return new Promise((res, rej) => {
    const fb = new Facebook({
      appID: process.env.FACEBOOK_APP_ID,
      secret: process.env.FACEBOOK_APP_SECRET,
    })
    fb.setAccessToken(accessToken)
    fb.api('/me?fields=name,email,id', (err, user) => {
      return err ? rej(err) : res(user)
    })
  })
}
