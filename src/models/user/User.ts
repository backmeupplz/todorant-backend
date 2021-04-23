import { GoogleCalendarCredentials } from '@/helpers/googleCalendar'
import { prop, Ref } from '@typegoose/typegoose'
import { omit } from 'lodash'

export enum SubscriptionStatus {
  earlyAdopter = 'earlyAdopter',
  active = 'active',
  trial = 'trial',
  inactive = 'inactive',
}

export interface Settings {
  showTodayOnAddTodo?: boolean
  firstDayOfWeek?: number
  startTimeOfDay?: string
  newTodosGoFirst?: boolean
  preserveOrderByTime?: boolean
  duplicateTagInBreakdown?: boolean
  showMoreByDefault?: boolean
  updatedAt?: Date
  googleCalendarCredentials?: GoogleCalendarCredentials
  language?: string
}

export enum TelegramLanguage {
  en = 'en',
  ru = 'ru',
  it = 'it',
  ua = 'ua',
}

export class User {
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
  @prop({ required: true, default: { preserveOrderByTime: true }, _id: false })
  settings: Settings

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
  @prop()
  appleReceipt?: String
  @prop()
  googleReceipt?: String
  @prop({ index: true, required: true, default: false })
  isPerpetualLicense: boolean

  @prop({ index: true, required: true, default: false })
  bouncerNotified: boolean
  @prop({ index: true, required: true, default: false })
  powerUserNotified: boolean
  @prop({ index: true, required: true, default: false })
  threeWeekUserNotified: boolean
  @prop({ required: true, default: false })
  createdOnApple: boolean

  @prop({ index: true, unique: true })
  delegateInviteToken?: string
  @prop({ ref: User, required: true, default: [], index: true })
  delegates: Ref<User>[]
  @prop({ default: new Date() })
  delegatesUpdatedAt: Date

  @prop()
  googleCalendarResourceId?: string

  // TODO переписать rest на RN под соккеты

  stripped(withExtra = false, withToken = true) {
    const stripFields = [
      '__v',
      'todos',
      'bouncerNotified',
      'powerUserNotified',
      'threeWeekUserNotified',
      'delegates',
      'googleCalendarResourceId',
    ]
    if (!withExtra) {
      stripFields.push('token')
      stripFields.push('email')
      stripFields.push('facebookId')
      stripFields.push('telegramId')
      stripFields.push('appleSubId')
      stripFields.push('createdOnApple')
      stripFields.push('subscriptionStatus')
      stripFields.push('subscriptionId')
      stripFields.push('appleReceipt')
      stripFields.push('googleReceipt')
      stripFields.push('isPerpetualLicense')
      stripFields.push('timezone')
      stripFields.push('settings')
      stripFields.push('createdAt')
      stripFields.push('telegramZen')
    }
    if (!withToken) {
      stripFields.push('token')
      stripFields.push('anonymousToken')
      stripFields.push('delegateInviteToken')
    }
    return omit(this._doc, stripFields)
  }

  // Mongo property
  updatedAt: Date
  _id: string
  _doc: any
  createdAt: Date
}
