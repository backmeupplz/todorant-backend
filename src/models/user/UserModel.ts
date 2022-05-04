import * as randToken from 'rand-token'
import { DocumentType, getModelForClass } from '@typegoose/typegoose'
import { Todo } from '@/models/todo'
import { User } from '@/models/user/User'
import { sign } from '@/helpers/jwt'

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
  // Try anonymous token
  if (!user && loginOptions.anonymousToken) {
    user = await UserModel.findOne({
      anonymousToken: loginOptions.anonymousToken,
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
    user = (await new UserModel({
      ...params,
      token: await sign(params),
    }).save()) as DocumentType<User>
  }
  return { created, user }
}

export async function sanitizeDelegation(
  clientTodo: Todo,
  user: User,
  serverTodo?: DocumentType<Todo>
) {
  if (!clientTodo.delegator) {
    clientTodo.user = user._id
  } else {
    if (clientTodo.delegator === user._id.toString()) {
      if (!clientTodo.user || !user.delegates.includes(clientTodo.user)) {
        clientTodo.user = user._id
        clientTodo.delegator = undefined
      }
      if (serverTodo && clientTodo.delegateAccepted) {
        serverTodo.updatedAt = new Date()
        await serverTodo.save()
        return true
      }
    } else {
      const delegator = await UserModel.findById(clientTodo.delegator)
      if (!delegator.delegates.includes(user._id)) {
        clientTodo.delegator = undefined
      }
      clientTodo.user = user._id
    }
  }
}
