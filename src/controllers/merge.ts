// Dependencies
import axios from 'axios'
import { Context } from 'koa'
import { UserModel, User, Todo, SubscriptionStatus } from '../models'
import { Controller, Post } from 'koa-router-ts'
import Facebook = require('facebook-node-sdk')
import { InstanceType } from 'typegoose'
import { errors } from '../helpers/errors'
import { authenticate } from '../middlewares/authenticate'
const TelegramLogin = require('node-telegram-login')
const Login = new TelegramLogin(process.env.TELEGRAM_LOGIN_TOKEN)

@Controller('/merge')
export default class {
  @Post('/facebook', authenticate)
  async facebook(ctx: Context) {
    // Get original user
    const originalUser = ctx.state.user as InstanceType<User>
    // Check if original user has facebook
    if (originalUser.facebookId) {
      return ctx.throw(errors.facebookAlreadyConnected)
    }
    // Get fb profile
    const fbProfile: any = await getFBUser(ctx.request.body.accessToken)
    // Get existing user if exists
    const existingUser:
      | InstanceType<User>
      | undefined = await UserModel.findOne({
      facebookId: fbProfile.id,
    }).populate('todos')
    // Add data if required
    if (existingUser) {
      existingUser.todos.map(async (todo: InstanceType<Todo>) => {
        todo.user = originalUser._id
        await todo.save()
        return todo.id
      })
      originalUser.todos = originalUser.todos.concat(existingUser.todos)
    }
    originalUser.facebookId = fbProfile.id
    // Check if early adopter
    if (
      existingUser &&
      existingUser.subscriptionStatus === SubscriptionStatus.earlyAdopter
    ) {
      originalUser.subscriptionStatus = SubscriptionStatus.earlyAdopter
    }
    // Delete the existing user if it exists
    if (existingUser) {
      await existingUser.remove()
    }
    // Save it
    await originalUser.save()
    // Respond
    ctx.status = 200
  }

  @Post('/telegram', authenticate)
  async telegram(ctx: Context) {
    const data = ctx.request.body
    // verify the data
    if (!Login.checkLoginData(data)) {
      return ctx.throw(403)
    }
    // Get original user
    const originalUser = ctx.state.user as InstanceType<User>
    // Check if original user has telegram
    if (originalUser.telegramId) {
      return ctx.throw(errors.telegramAlreadyConnected)
    }
    // Get existing user if exists
    const existingUser:
      | InstanceType<User>
      | undefined = await UserModel.findOne({ telegramId: data.id }).populate(
      'todos'
    )
    // Add data if required
    if (existingUser) {
      existingUser.todos.map(async (todo: InstanceType<Todo>) => {
        todo.user = originalUser._id
        await todo.save()
        return todo.id
      })
      originalUser.todos = originalUser.todos.concat(existingUser.todos)
    }
    originalUser.telegramId = data.id
    // Check if early adopter
    if (
      existingUser &&
      existingUser.subscriptionStatus === SubscriptionStatus.earlyAdopter
    ) {
      originalUser.subscriptionStatus = SubscriptionStatus.earlyAdopter
    }
    // Delete the existing user if it exists
    if (existingUser) {
      await existingUser.remove()
    }
    // Save it
    await originalUser.save()
    // Respond
    ctx.status = 200
  }

  @Post('/google', authenticate)
  async google(ctx: Context) {
    const accessToken = ctx.request.body.accessToken

    const userData: any = (
      await axios(
        `https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=${accessToken}`
      )
    ).data
    // Get original user
    const originalUser = ctx.state.user as InstanceType<User>
    // Check if original user has telegram
    if (originalUser.email) {
      return ctx.throw(errors.googleAlreadyConnected)
    }
    // Get existing user if exists
    const existingUser:
      | InstanceType<User>
      | undefined = await UserModel.findOne({ email: userData.email }).populate(
      'todos'
    )
    // Add data if required
    if (existingUser) {
      existingUser.todos.map(async (todo: InstanceType<Todo>) => {
        todo.user = originalUser._id
        await todo.save()
        return todo.id
      })
      originalUser.todos = originalUser.todos.concat(existingUser.todos)
    }
    originalUser.email = userData.email
    // Check if early adopter
    if (
      existingUser &&
      existingUser.subscriptionStatus === SubscriptionStatus.earlyAdopter
    ) {
      originalUser.subscriptionStatus = SubscriptionStatus.earlyAdopter
    }
    // Delete the existing user if it exists
    if (existingUser) {
      await existingUser.remove()
    }
    // Save it
    await originalUser.save()
    // Respond
    ctx.status = 200
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
