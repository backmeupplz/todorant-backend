// Dependencies
import { sign } from '../helpers/jwt'
import {
  prop,
  Typegoose,
  InstanceType,
  instanceMethod,
  arrayProp,
  Ref,
} from 'typegoose'
import { omit } from 'lodash'
import { Todo } from './todo'

export enum SubscriptionStatus {
  earlyAdopter = 'earlyAdopter',
  active = 'active',
  trial = 'trial',
  inactive = 'inactive',
}

class Settings {
  showTodayOnAddTodo?: boolean
  firstDayOfWeek?: number
}

export class User extends Typegoose {
  @prop({ index: true, lowercase: true })
  email?: string
  @prop({ index: true, lowercase: true })
  facebookId?: string
  @prop({ index: true, lowercase: true })
  telegramId?: string
  @prop({ required: true, index: true })
  name: string
  @prop({ required: true, default: {} })
  settings: Settings
  @arrayProp({ required: true, itemsRef: Todo, default: [] })
  todos: Ref<Todo>[]

  @prop({ required: true, index: true, unique: true })
  token: string

  @prop({ required: true, default: 0 })
  timezone: number
  @prop({ required: true, default: false })
  telegramZen: boolean

  @prop({
    index: true,
    required: true,
    enum: SubscriptionStatus,
    default: 'earlyAdopter',
  })
  subscriptionStatus: SubscriptionStatus
  @prop({ index: true })
  subscriptionId?: String

  @instanceMethod
  stripped(withExtra = false, withToken = true) {
    const stripFields = ['createdAt', 'updatedAt', '__v', 'todos']
    if (!withExtra) {
      stripFields.push('token')
      stripFields.push('email')
      stripFields.push('facebookId')
      stripFields.push('telegramId')
    }
    if (!withToken) {
      stripFields.push('token')
    }
    return omit(this._doc, stripFields)
  }

  // Mongo property
  _doc: any
}

export const UserModel = new User().getModelForClass(User, {
  schemaOptions: { timestamps: true },
})

interface LoginOptions {
  email?: string
  facebookId?: string
  telegramId?: string

  name: string
}

export async function getOrCreateUser(loginOptions: LoginOptions) {
  if (!loginOptions.name) {
    throw new Error()
  }
  let user: InstanceType<User> | undefined
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
  if (!user) {
    // Check if we have credentials
    if (
      !(
        loginOptions.email ||
        loginOptions.facebookId ||
        loginOptions.telegramId
      )
    ) {
      throw new Error()
    }
    const params = {
      name: loginOptions.name,
      subscriptionStatus: SubscriptionStatus.trial,
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
    user = await new UserModel({
      ...params,
      token: await sign(params),
    }).save()
  }
  return user
}
