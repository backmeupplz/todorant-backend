import app from '@/app'
import { checkSubscription } from '@/middlewares/checkSubscription'
import { runMongo } from '@/models/index'
import { UserModel } from '@/models/user'
import { MongoMemoryServer } from 'mongodb-memory-server'
import * as mongoose from 'mongoose'

describe('CheckSubscription', () => {
  const mongoServer = new MongoMemoryServer()

  beforeAll(async () => {
    runMongo(await mongoServer.getUri())
  })

  beforeEach(async () => {
    const collections = mongoose.connection.collections

    for (const key in collections) {
      const collection = collections[key]
      await collection.deleteMany({})
    }
  })

  afterAll(async () => app.close())

  it('should complete on a request from a subscribed user', async () => {
    const user = await UserModel.create(userSubscriptionActive)
    const ctx: any = {
      state: { user: user },
      throw: (statusCode: number, errorMessage: string) => {
        const err: any = new Error(errorMessage)
        err.status = statusCode
        err.expose = true
        throw err
      },
    }
    const mockSubscription: any = { completed: false }
    // Simply pass a noop function as `next` argument
    const noop = () => {
      mockSubscription.completed = true
    }
    await checkSubscription(ctx, noop)
    expect(mockSubscription.completed).toBe(true)
  })

  it('should fail on a request from an unsubscribed user', async () => {
    const user = await UserModel.create(userSubscriptionInactive)
    const ctx: any = {
      state: {
        user: user,
        status: 0,
        message: '',
      },
      throw: (statusCode: number, errorMessage: string) => {
        ctx.state.status = statusCode
        ctx.state.message = errorMessage
      },
    }
    // Simply pass a noop function as `next` argument
    const noop = () => {}
    await checkSubscription(ctx, noop)
    expect(ctx.state.status).toBe(403)
    expect(ctx.state.message).toBe(
      '{"en":"You have to buy the subscription","ru":"Вам нужно приобрести подписку"}'
    )
  })

  it('should fail on a request from undefined user', async () => {
    const ctx: any = {
      state: {
        status: 0,
        message: '',
      },
      throw: (statusCode: number, errorMessage: string) => {
        ctx.state.status = statusCode
        ctx.state.message = errorMessage
      },
    }
    // Simply pass a noop function as `next` argumen
    const noop = () => {}
    await checkSubscription(ctx, noop)
    expect(ctx.state.status).toBe(403)
    expect(ctx.state.message).toBe(
      '{"en":"Authentication failed","ru":"Аутентификация провалилась"}'
    )
  })
})

const userSubscriptionActive = {
  name: 'Alexander Brennenburg',
  email: 'alexanderrennenburg@gmail.com',
  subscriptionStatus: 'active',
  token:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoiQWxleGFuZGVyIEJyZW5uZW5idXJnIiwic3Vic2NyaXB0aW9uU3RhdHVzIjoidHJpYWwiLCJkZWxlZ2F0ZUludml0ZVRva2VuIjoiR090WWwyRUVaSE1OMmF1cSIsImVtYWlsIjoiYWxleGFuZGVycmVubmVuYnVyZ0BnbWFpbC5jb20iLCJpYXQiOjE2MDUxMjY5MTF9.Z17DwU2HuIcqBgvrzl65X47q3iRMuvybbYLmz9yc5ns',
}

const userSubscriptionInactive = {
  name: 'Anastasie Trianon',
  email: 'anastasietrianon@gmail.com',
  subscriptionStatus: 'inactive',
  token:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoiQW5hc3Rhc2llIFRyaWFub24iLCJzdWJzY3JpcHRpb25TdGF0dXMiOiJ0cmlhbCIsImRlbGVnYXRlSW52aXRlVG9rZW4iOiJDMVJ6Z051MVJLczluSEFVIiwiZW1haWwiOiJhbmFzdGFzaWV0cmlhbm9uQGdtYWlsLmNvbSIsImlhdCI6MTYwNTE5OTY5NX0.CNOdaBVs6VMon0KLPsQpGRuXOJSM_GaXVs8DVGaULmU',
}
