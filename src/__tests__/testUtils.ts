import * as Koa from 'koa'
import * as mongoose from 'mongoose'
import { Server } from 'http'
import { Todo } from '@/models/todo/Todo'
import { User } from '@/models/user/User'
import Facebook = require('facebook-node-sdk')
export const facebookApiSpy = jest.spyOn(Facebook.prototype, 'api')
import * as decode from 'jsonwebtoken'
export const decodeSpy = jest.spyOn(decode, 'decode')
import * as AppleToken from '@/helpers/jwt'
export const verifyAppleTokenSpy = jest.spyOn(AppleToken, 'verifyAppleToken')
import { bot } from '@/helpers/telegram'
export const botGetChatSpy = jest.spyOn(bot.telegram, 'getChat')
export const botSendMessageSpy = jest.spyOn(bot.telegram, 'sendMessage')
import * as telegramPayloadHelper from '@/helpers/verifyTelegramPayload'
export const verifyTelegramPayloadSpy = jest.spyOn(
  telegramPayloadHelper,
  'verifyTelegramPayload'
)
// eslint-disable-next-line @typescript-eslint/no-var-requires
const AppleAuth = require('apple-auth')
export const accessTokenSpy = jest.spyOn(AppleAuth.prototype, 'accessToken')

export function dropMongo() {
  return Promise.all(
    Object.values(mongoose.connection.collections).map((collection) =>
      collection.deleteMany({})
    )
  )
}

export const completeUser = {
  name: 'Default Name',
  email: 'defaultname@gmail.com',
}

export const createdCompleteUser = {
  ...completeUser,
  _id: 'testUserId',
  createdAt: new Date(),
  _doc: {
    createdAt: new Date(),
  },
  settings: {},
  createdAtts: '',
  timezone: 0,
  telegramZen: false,
  bouncerNotified: false,
  powerUserNotified: false,
  threeWeekUserNotified: false,
  createdOnApple: false,
  delegates: [],
  stripped: new User().stripped,
  isPerpetualLicense: false,
  updatedAt: new Date(),
  delegatesUpdatedAt: new Date(),
} as Omit<User, 'token'>

export const completeTodo = {
  user: createdCompleteUser,
  text: 'Do this',
  completed: false,
  frog: false,
  repetitive: false,
  frogFails: 0,
  skipped: false,
  order: 0,
  deleted: false,
  encrypted: false,
  monthAndYear: '10-2020',
  date: '21',
  time: '01:01',
  delegateAccepted: false,
} as Todo

export function startKoa(
  app: Koa<Koa.DefaultState, Koa.DefaultContext>
): Promise<Server> {
  return new Promise((res, rej) => {
    const connection = app
      .listen()
      .on('listening', () => {
        res(connection)
      })
      .on('error', rej)
  })
}

export function stopServer(server: Server) {
  return new Promise<void>((res) => {
    server.close(() => {
      res()
    })
  })
}

export function transformToBeEqual(strippedUser: User) {
  return {
    ...strippedUser,
    delegatesUpdatedAt: strippedUser.delegatesUpdatedAt.toJSON(),
    createdAt: strippedUser.createdAt.toJSON(),
    updatedAt: strippedUser.updatedAt.toJSON(),
    _id: strippedUser._id.toString(),
  }
}
