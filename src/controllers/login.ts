// Dependencies
import axios from 'axios'
import { Context } from 'koa'
import { getOrCreateUser, UserModel, SubscriptionStatus } from '../models'
import { Controller, Post } from 'koa-router-ts'
import Facebook = require('facebook-node-sdk')
import { decode } from 'jsonwebtoken'
import { sign } from '../helpers/jwt'

const TelegramLogin = require('node-telegram-login')
const Login = new TelegramLogin(process.env.TELEGRAM_LOGIN_TOKEN)
const AppleAuth = require('apple-auth')

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

    const userData: any = (await axios(
      `https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=${accessToken}`
    )).data

    const user = await getOrCreateUser({
      name: userData.name,

      email: userData.email,
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
      const name = `${userJson.name.firstName}${
        userJson.name.lastName ? ` ${userJson.name.lastName}` : ''
      }`
      const params = {
        name,
        appleSubId,
        subscriptionStatus: SubscriptionStatus.trial,
        email,
      } as any
      // Try to find this user one
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
      const user = await UserModel.findOne({ appleSubId })
      if (!user) {
        ctx.throw(404)
      } else {
        ctx.body = user.stripped(true)
      }
    }
  }
}

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
