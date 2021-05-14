import { sign, verifyAppleToken } from '@/helpers/jwt'
import { bot } from '@/helpers/telegram'
import { verifyTelegramPayload } from '@/helpers/verifyTelegramPayload'
import { getUserFromToken } from '@/middlewares/authenticate'
import {
  getOrCreateUser,
  SubscriptionStatus,
  User,
  UserModel,
} from '@/models/user'
import { DocumentType } from '@typegoose/typegoose'
import axios from 'axios'
import { decode } from 'jsonwebtoken'
import { Context } from 'koa'
import { Controller, Ctx, Get, Post } from 'koa-ts-controllers'
import * as randToken from 'rand-token'
import { Markup as m } from 'telegraf'
import Facebook = require('facebook-node-sdk')
import { v4 as uuid } from 'uuid'
import { QrLoginModel } from '@/models/QrLoginModel'

const AppleAuth = require('apple-auth')

const telegramLoginRequests = {} as {
  [index: string]: {
    user: User
    allowed?: boolean
  }
}

async function tryPurchasingApple(user: DocumentType<User>, receipt: string) {
  const appleUrl =
    process.env.ENVIRONMENT === 'staging'
      ? 'https://sandbox.itunes.apple.com/verifyReceipt'
      : 'https://buy.itunes.apple.com/verifyReceipt'
  const password = process.env.APPLE_SECRET
  const response = await axios.post(appleUrl, {
    'receipt-data': receipt,
    password,
  })
  const latestReceipt = response.data.latest_receipt
  const latestReceiptInfo = response.data.latest_receipt_info
  // Get latest
  let latestSubscription = 0
  for (const info of latestReceiptInfo) {
    if (info.expires_date_ms > latestSubscription) {
      latestSubscription = info.expires_date_ms
    }
  }
  // Check status
  const subscriptionIsActive = new Date().getTime() < latestSubscription
  if (subscriptionIsActive) {
    user.subscriptionStatus = SubscriptionStatus.active
  }
  user.appleReceipt = latestReceipt
  await user.save()
}

@Controller('/login')
export default class LoginController {
  @Post('/facebook')
  async facebook(@Ctx() ctx: Context) {
    const fbProfile: any = await getFBUser(ctx.request.body.accessToken)
    const { created, user } = await getOrCreateUser({
      name: fbProfile.name,

      email: fbProfile.email,
      facebookId: fbProfile.id,
    })
    if (created && ctx.request.body.fromApple) {
      user.createdOnApple = true
      await user.save()
    }
    if (ctx.request.body.appleReceipt) {
      tryPurchasingApple(user, ctx.request.body.appleReceipt)
    }
    return user.stripped(true)
  }

  @Post('/telegram')
  async telegram(@Ctx() ctx: Context) {
    const data = ctx.request.body
    // verify the data
    if (!verifyTelegramPayload(data)) {
      return ctx.throw(403)
    }

    const { created, user } = await getOrCreateUser({
      name: `${data.first_name}${data.last_name ? ` ${data.last_name}` : ''}`,
      telegramId: data.id,
    })
    if (created && ctx.request.body.fromApple) {
      user.createdOnApple = true
      await user.save()
    }
    if (ctx.request.body.appleReceipt) {
      tryPurchasingApple(user, ctx.request.body.appleReceipt)
    }
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

    const { created, user } = await getOrCreateUser({
      name: userData.name,

      email: userData.email,
    })
    if (created && ctx.request.body.fromApple) {
      user.createdOnApple = true
      await user.save()
    }
    if (ctx.request.body.appleReceipt) {
      tryPurchasingApple(user, ctx.request.body.appleReceipt)
    }
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

    const { created, user } = await getOrCreateUser({
      name: userData.name,

      email: userData.email,
    })
    if (created && ctx.request.body.fromApple) {
      user.createdOnApple = true
      await user.save()
    }
    if (ctx.request.body.appleReceipt) {
      tryPurchasingApple(user, ctx.request.body.appleReceipt)
    }
    return user.stripped(true)
  }

  @Post('/anonymous')
  async anonymous(@Ctx() ctx: Context) {
    const { created, user } = await getOrCreateUser({
      name: 'Anonymous user',
      anonymousToken: randToken.generate(16),
    })
    if (created && ctx.request.body.fromApple) {
      user.createdOnApple = true
      await user.save()
    }
    if (ctx.request.body.appleReceipt) {
      tryPurchasingApple(user, ctx.request.body.appleReceipt)
    }
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
        subscriptionStatus: SubscriptionStatus.trial,
        email,
        delegateInviteToken: randToken.generate(16),
      } as any
      // Try to find this user
      let user = await UserModel.findOne({ appleSubId })
      if (user) {
        return user.stripped(true)
      }
      user = await new UserModel({
        ...params,
        token: await sign(params),
      }).save()
      const created = true
      if (created && ctx.request.body.fromApple) {
        user.createdOnApple = true
        await user.save()
      }
      if (ctx.request.body.appleReceipt) {
        tryPurchasingApple(user, ctx.request.body.appleReceipt)
      }
      return user.stripped(true)
    } else {
      let user = await UserModel.findOne({ appleSubId })
      if (!user) {
        const params = {
          name: 'Unidentified Apple',
          appleSubId,
          subscriptionStatus: SubscriptionStatus.trial,
        } as any
        user = await new UserModel({
          ...params,
          token: await sign(params),
        }).save()
        const created = true
        if (created && ctx.request.body.fromApple) {
          user.createdOnApple = true
          await user.save()
        }
      }
      if (ctx.request.body.appleReceipt) {
        tryPurchasingApple(user, ctx.request.body.appleReceipt)
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
      subscriptionStatus: SubscriptionStatus.trial,
      delegateInviteToken: randToken.generate(16),
    } as any
    user = await new UserModel({
      ...params,
      token: await sign(params),
    }).save()

    return user.stripped(true)
  }

  @Post('/telegram_mobile')
  async telegramMobile(@Ctx() ctx: Context) {
    let { uuid, id } = ctx.request.body as {
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
    let { uuid } = ctx.request.body as {
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
    if (ctx.request.body.appleReceipt) {
      tryPurchasingApple(user, ctx.request.body.appleReceipt)
    }
    return user.stripped(true)
  }

  @Post('/apple_login_result')
  async appleLoginResult(@Ctx() ctx: Context) {
    const { id_token, user } = ctx.request.body
    const userArg = !!user ? `&user=${JSON.stringify(user)}` : ''
    ctx.redirect(
      `https://todorant.com/apple_login_result#?id_token=${id_token}${userArg}`
    )
    return 'Success!'
  }

  @Get('/generate_uuid')
  async generateQrUuid(@Ctx() ctx: Context) {
    const qrUuid = uuid()
    await new QrLoginModel({ uuid: qrUuid }).save()
    return { uuid: qrUuid }
  }

  @Post('/qr_token')
  async setQrToken(@Ctx() ctx: Context) {
    const qrUuid = ctx.request.body.uuid
    const token = ctx.request.body.token
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
  telegramLoginRequests[
    ctx.callbackQuery.data.replace('lta~', '')
  ].allowed = true
})

bot.action(/ltr~.+/, async (ctx) => {
  await ctx.deleteMessage()
  telegramLoginRequests[
    ctx.callbackQuery.data.replace('ltr~', '')
  ].allowed = false
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
