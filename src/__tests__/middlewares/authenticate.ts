import { authenticate } from '../../middlewares/authenticate'
import * as request from 'supertest'
import * as mongoose from 'mongoose'
import app from '@/app'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { runMongo } from '@/models/index'
import { User } from '@/models/user'

describe('Authenticate', () => {
  const mongoServer = new MongoMemoryServer()

  beforeAll(async () => {
    runMongo(await mongoServer.getUri())
  })

  beforeEach(async () => {
    const collections = mongoose.connection.collections
  })

  afterAll(async () => app.close())

  test('authenticate', async () => {
    const user = (
      await request(app).post('/login/google').send({ accessToken: 'test' })
    ).body as User
    const ctx = {
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
})
