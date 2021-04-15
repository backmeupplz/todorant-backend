import { User, SubscriptionStatus } from '@/models/user/User'
import { sign } from '@/helpers/jwt'
import { DocumentType, getModelForClass } from '@typegoose/typegoose'
import * as randToken from 'rand-token'

export const UserModel = getModelForClass(User, {
  schemaOptions: { timestamps: true },
})

interface LoginOptions {
  email?: string
  facebookId?: string
  telegramId?: string
  anonymousToken?: string

  name: string
}

export async function getOrCreateUser(loginOptions: LoginOptions) {
  if (!loginOptions.name) {
    throw new Error()
  }
  let user: DocumentType<User> | undefined
  // Try email
  if (loginOptions.email) {
    user = await UserModel.findOne({ email: loginOptions.email })
  }
  // Try facebook id
  if (!user && loginOptions.facebookId) {
    user = await UserModel.findOne({
      facebookId: loginOptions.facebookId,
    })
  }
  // Try telegram id
  if (!user && loginOptions.telegramId) {
    user = await UserModel.findOne({
      telegramId: loginOptions.telegramId,
    })
  }
  let created = false
  if (!user) {
    created = true
    // Check if we have credentials
    if (
      !(
        loginOptions.email ||
        loginOptions.facebookId ||
        loginOptions.telegramId ||
        loginOptions.anonymousToken
      )
    ) {
      throw new Error()
    }
    const params = {
      name: loginOptions.name,
      subscriptionStatus: SubscriptionStatus.trial,
      delegateInviteToken: randToken.generate(16),
    } as any
    if (loginOptions.email) {
      params.email = loginOptions.email
    }
    if (loginOptions.facebookId) {
      params.facebookId = loginOptions.facebookId
    }
    if (loginOptions.telegramId) {
      params.telegramId = loginOptions.telegramId
    }
    if (loginOptions.anonymousToken) {
      params.anonymousToken = loginOptions.anonymousToken
    }
    user = await new UserModel({
      ...params,
      token: await sign(params),
    }).save()
  }
  return { created, user }
}