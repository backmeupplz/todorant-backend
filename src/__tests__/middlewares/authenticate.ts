import { authenticate } from '@/middlewares/authenticate'
import * as mongoose from 'mongoose'
import app from '@/app'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { runMongo } from '@/models/index'
import { User, UserModel } from '@/models/user'

describe('Authenticate', () => {
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

  test('authenticate', async () => {
    const user = await UserModel.create(userComplete)
    const ctx: any = {
      headers: {
        token: user.token,
      },
      state: { user: User },
      throw: (statusCode: number, errorMessage: string) => {
        const err: any = new Error(errorMessage)
        err.status = statusCode
        err.expose = true
        throw err
      },
    }
    // Simply pass a noop function as `next` argument
    const noop = () => {}
    await authenticate(ctx, noop)
    expect(ctx.state.user.name).toBe('Alexander Brennenburg')
  })

  test('authenticate', async () => {
    const ctx: any = {
      state: {
        status: 0,
        message: '',
      },
      throw: (statusCode, message) => {
        ctx.state.status = statusCode
        ctx.state.message = message
      },
    }
    // Simply pass a noop function as `next` argument
    const noop = () => {}
    await authenticate(ctx, noop)
    expect(ctx.state.status).toBe(403)
    expect(ctx.state.message).toBe(
      '{"en":"Authentication failed","ru":"Аутентификация провалилась"}'
    )
  })
})

const userComplete = {
  name: 'Alexander Brennenburg',
  email: 'alexanderrennenburg@gmail.com',
  token:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoiQWxleGFuZGVyIEJyZW5uZW5idXJnIiwic3Vic2NyaXB0aW9uU3RhdHVzIjoidHJpYWwiLCJkZWxlZ2F0ZUludml0ZVRva2VuIjoiR090WWwyRUVaSE1OMmF1cSIsImVtYWlsIjoiYWxleGFuZGVycmVubmVuYnVyZ0BnbWFpbC5jb20iLCJpYXQiOjE2MDUxMjY5MTF9.Z17DwU2HuIcqBgvrzl65X47q3iRMuvybbYLmz9yc5ns',
}
