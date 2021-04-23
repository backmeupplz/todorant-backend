import * as mongoose from 'mongoose'
import * as Koa from 'koa'
import { Server } from 'http'
import { User, SubscriptionStatus } from '@/models/user/User'
import { Todo } from '@/models/todo/Todo'

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
  token:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoiQWxleGFuZGVyIEJyZW5uZW5idXJnIiwic3Vic2NyaXB0aW9uU3RhdHVzIjoidHJpYWwiLCJkZWxlZ2F0ZUludml0ZVRva2VuIjoiR090WWwyRUVaSE1OMmF1cSIsImVtYWlsIjoiYWxleGFuZGVycmVubmVuYnVyZ0BnbWFpbC5jb20iLCJpYXQiOjE2MDUxMjY5MTF9.Z17DwU2HuIcqBgvrzl65X47q3iRMuvybbYLmz9yc5ns',
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
} as User

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
