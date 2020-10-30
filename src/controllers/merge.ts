import { verifyTelegramPayload } from '@/helpers/verifyTelegramPayload'
import axios from 'axios'
import { Context } from 'koa'
import { UserModel, User, SubscriptionStatus } from '@/models/user'
import { TodoModel } from '@/models/todo'
import { Controller, Ctx, Flow, Post } from 'koa-ts-controllers'
import Facebook = require('facebook-node-sdk')
import { DocumentType } from '@typegoose/typegoose'
import { errors } from '@/helpers/errors'
import { authenticate } from '@/middlewares/authenticate'

@Controller('/merge')
export default class MergeController {
  @Post('/facebook')
  @Flow(authenticate)
  async facebook(@Ctx() ctx: Context) {
    // Get original user
    const originalUser = ctx.state.user as DocumentType<User>
    // Check if original user has facebook
    if (originalUser.facebookId) {
      return ctx.throw(errors.facebookAlreadyConnected)
    }
    // Get fb profile
    const fbProfile: any = await getFBUser(ctx.request.body.accessToken)
    // Get existing user if exists
    const existingUser:
      | DocumentType<User>
      | undefined = await UserModel.findOne({
      facebookId: fbProfile.id,
    })
    // Add data if required
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
      // Transition tasks
      const todos = await TodoModel.find({ user: existingUser.id })
      for (const todo of todos) {
        todo.user = originalUser.id
        await todo.save()
      }
      // Remove existing user
      await existingUser.remove()
    }
    // Save it
    await originalUser.save()
    // Respond
    ctx.status = 200
  }

  @Post('/telegram')
  @Flow(authenticate)
  async telegram(@Ctx() ctx: Context) {
    const data = ctx.request.body
    // verify the data
    if (!verifyTelegramPayload(data)) {
      return ctx.throw(403)
    }
    // Get original user
    const originalUser = ctx.state.user as DocumentType<User>
    // Check if original user has telegram
    if (originalUser.telegramId) {
      return ctx.throw(errors.telegramAlreadyConnected)
    }
    // Get existing user if exists
    const existingUser:
      | DocumentType<User>
      | undefined = await UserModel.findOne({ telegramId: data.id })
    // Add data if required
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
      // Transition tasks
      const todos = await TodoModel.find({ user: existingUser.id })
      for (const todo of todos) {
        todo.user = originalUser.id
        await todo.save()
      }
      // Change created at
      originalUser.createdAt = existingUser.createdAt
      // Remove existing user
      await existingUser.remove()
    }
    // Save it
    await originalUser.save()
    // Respond
    return { telegramId: originalUser.telegramId }
    ctx.status = 200
  }

  @Post('/google')
  @Flow(authenticate)
  async google(@Ctx() ctx: Context) {
    const accessToken = ctx.request.body.accessToken

    const userData: any = (
      await axios(
        `https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=${accessToken}`
      )
    ).data
    // Get original user
    const originalUser = ctx.state.user as DocumentType<User>
    // Check if original user has telegram
    if (originalUser.email) {
      return ctx.throw(errors.googleAlreadyConnected)
    }
    // Get existing user if exists
    const existingUser:
      | DocumentType<User>
      | undefined = await UserModel.findOne({ email: userData.email })
    // Add data if required
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
      // Transition tasks
      const todos = await TodoModel.find({ user: existingUser.id })
      for (const todo of todos) {
        todo.user = originalUser.id
        await todo.save()
      }
      // Remove existing user
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
