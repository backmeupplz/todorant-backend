// Dependencies
import axios from 'axios'
import { Context } from 'koa'
import { getOrCreateUser, UserModel, SubscriptionStatus, User } from '../models'
import { Controller, Post } from 'koa-router-ts'
import Facebook = require('facebook-node-sdk')
import { decode } from 'jsonwebtoken'
import { sign } from '../helpers/jwt'
import * as randToken from 'rand-token'
import { bot } from '../helpers/telegram'
import { Markup as m } from 'telegraf'

const TelegramLogin = require('node-telegram-login')
const Login = new TelegramLogin(process.env.TELEGRAM_LOGIN_TOKEN)
const AppleAuth = require('apple-auth')

const telegramLoginRequests = {} as {
  [index: string]: {
    user: User
    allowed?: boolean
  }
}

@Controller('/login')
export default class {
  @Post('/facebook')
  async facebook(ctx: Context) {
    const fbProfile: any = await getFBUser(ctx.request.body.accessToken)
    const user = await getOrCreateUser({
      name: fbProfile.name,

      email: fbProfile.email,
      facebookId: fbProfile.id,
    })
    ctx.body = user.stripped(true)
  }

  @Post('/telegram')
  async telegram(ctx: Context) {
    const data = ctx.request.body
    // verify the data
    if (!Login.checkLoginData(data)) {
      return ctx.throw(403)
    }

    const user = await getOrCreateUser({
      name: `${data.first_name}${data.last_name ? ` ${data.last_name}` : ''}`,
      telegramId: data.id,
    })
    ctx.body = user.stripped(true)
  }

  @Post('/google')
  async google(ctx: Context) {
    const accessToken = ctx.request.body.accessToken

    const userData: any = (
      await axios(
        `https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=${accessToken}`
      )
    ).data

    const user = await getOrCreateUser({
      name: userData.name,

      email: userData.email,
    })
    ctx.body = user.stripped(true)
  }

  @Post('/anonymous')
  async anonymous(ctx: Context) {
    const user = await getOrCreateUser({
      name: 'Anonymous user',
      anonymousToken: randToken.generate(16),
    })
    ctx.body = user.stripped(true)
  }

  @Post('/apple')
  async apple(ctx: Context) {
    const appleAuth = new AppleAuth(
      {
        client_id:
          ctx.request.body.client && ctx.request.body.client === 'ios'
            ? 'com.todorant.app'
            : 'com.todorant.web',
        team_id: 'ACWP4F58HZ',
        key_id: 'J75L72AKZX',
        redirect_uri: 'https://backend.todorant.com/apple',
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
      } as any
      // Try to find this user
      let user = await UserModel.findOne({ appleSubId })
      if (user) {
        ctx.body = user.stripped(true)
        return
      }
      user = await new UserModel({
        ...params,
        token: await sign(params),
      }).save()
      ctx.body = user.stripped(true)
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
      }
      ctx.body = user.stripped(true)
    }
  }

  @Post('/telegram_mobile')
  async telegramMobile(ctx: Context) {
    let { uuid, id } = ctx.request.body as {
      uuid: string
      id?: string
    }
    if (!uuid || !id) {
      return ctx.throw(403, 'Invalid request')
    }
    try {
      const user = await bot.telegram.getChat(id)
      if (user.type !== 'private') {
        throw new Error('Chat is not private')
      }
      const dbuser = await getOrCreateUser({
        name: `${user.first_name}${user.last_name ? ` ${user.last_name}` : ''}`,
        telegramId: `${user.id}`,
      })
      await bot.telegram.sendMessage(
        id,
        'Somebody wants to login to your account on Todorant. Do no press "Allow" if it wasn\'t you!',
        {
          reply_markup: m.inlineKeyboard([
            m.callbackButton('Allow', `lta~${uuid}`),
            m.callbackButton('Reject', `ltr~${uuid}`),
          ]),
        }
      )
      telegramLoginRequests[uuid] = {
        user: dbuser.stripped(true) as User,
      }
      ctx.status = 200
    } catch (err) {
      return ctx.throw(404, 'Cannot send message')
    }
  }

  @Post('/telegram_mobile_check')
  async telegramMobileCheck(ctx: Context) {
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
      ctx.body = {
        allowed: result.allowed,
        user: result.allowed ? result.user : undefined,
      }
      ctx.status = 200
    } catch (err) {
      return ctx.throw(new Error())
    }
  }
}

bot.action(/lta~.+/, async ctx => {
  await ctx.deleteMessage()
  telegramLoginRequests[
    ctx.callbackQuery.data.replace('lta~', '')
  ].allowed = true
})

bot.action(/ltr~.+/, async ctx => {
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
