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

export class Settings {
  showTodayOnAddTodo?: boolean
  firstDayOfWeek?: number
  newTodosGoFirst?: boolean
  updatedAt?: Date
}

export enum TelegramLanguage {
  en = 'en',
  ru = 'ru',
}

export class User extends Typegoose {
  @prop({ index: true, lowercase: true })
  email?: string
  @prop({ index: true, lowercase: true })
  facebookId?: string
  @prop({ index: true, lowercase: true })
  telegramId?: string
  @prop({ index: true })
  anonymousToken?: string
  @prop({ index: true, lowercase: true })
  appleSubId?: string
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
  @prop({ enum: TelegramLanguage, index: true })
  telegramLanguage?: TelegramLanguage

  @prop({
    index: true,
    required: true,
    enum: SubscriptionStatus,
    default: 'earlyAdopter',
  })
  subscriptionStatus: SubscriptionStatus
  @prop({ index: true })
  subscriptionId?: String
  @prop({ index: true })
  appleReceipt?: String

  @prop({ index: true, required: true, default: false })
  bouncerNotified: boolean

  @instanceMethod
  stripped(withExtra = false, withToken = true) {
    const stripFields = [
      'createdAt',
      'updatedAt',
      '__v',
      'todos',
      'bouncerNotified',
    ]
    if (!withExtra) {
      stripFields.push('token')
      stripFields.push('email')
      stripFields.push('facebookId')
      stripFields.push('telegramId')
      stripFields.push('appleSubId')
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
  anonymousToken?: string

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
        loginOptions.telegramId ||
        loginOptions.anonymousToken
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
    if (loginOptions.anonymousToken) {
      params.anonymousToken = loginOptions.anonymousToken
    }
    user = await new UserModel({
      ...params,
      token: await sign(params),
    }).save()
  }
  return user
}
