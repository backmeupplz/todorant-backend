import * as mongoose from 'mongoose'
import * as Koa from 'koa'
import { Server } from 'http'
import { User, SubscriptionStatus } from '@/models/user/User'
import { Todo } from '@/models/todo/Todo'
import Facebook = require('facebook-node-sdk')
export const FacebookApiSpy = jest.spyOn(Facebook.prototype, 'api')
import * as decode from 'jsonwebtoken'
export const decodeSpy = jest.spyOn(decode, 'decode')
import * as AppleToken from '@/helpers/jwt'
export const verifyAppleTokenSpy = jest.spyOn(AppleToken, 'verifyAppleToken')
import * as telegramPayloadHelper from '@/helpers/verifyTelegramPayload'
export const verifyTelegramPayloadSpy = jest.spyOn(
  telegramPayloadHelper,
  'verifyTelegramPayload'
)
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
  name: 'Alexander Brennenburg',
  email: 'alexanderrennenburg@gmail.com',
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
  subscriptionStatus: SubscriptionStatus.earlyAdopter,
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
  _id: 'testTodoId',
  _doc: {
    createdAt: new Date(),
  },
  user: createdCompleteUser,
  text: 'Do this',
  completed: false,
  frog: false,
  frogFails: 0,
  skipped: false,
  order: 0,
  deleted: false,
  encrypted: false,
  monthAndYear: '10-2020',
  date: '21',
  time: null,
  stripped: new Todo().stripped,
  updatedAt: new Date(),
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
