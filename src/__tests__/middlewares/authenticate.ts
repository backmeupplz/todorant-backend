import { sign } from '@/helpers/jwt'
import { app } from '@/app'
import { authenticate } from '@/middlewares/authenticate'
import { runMongo, stopMongo } from '@/models/index'
import { UserModel } from '@/models/user'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { Server } from 'http'
import { dropMongo, startKoa, stopServer } from '@/__tests__/testUtils'

describe('Authenticate', () => {
  let server: Server

  beforeAll(async () => {
    const mongoServer = new MongoMemoryServer()
    await runMongo(await mongoServer.getUri())
    server = await startKoa(app)
  })

  beforeEach(async () => {
    await dropMongo()
  })

  afterAll(async () => {
    await stopMongo()
    await stopServer(server)
  })

  it('should call next if everything is ok', async () => {
    process.env.JWT = 'test_secret'
    const token = await sign(user)
    console.log(token)
    await UserModel.create({ ...user, token })
    const ctx = await check(true, token)
    expect(ctx.state.user.name).toBe(user.name)
    expect(ctx.state.user.email).toBe(user.email)
  })

  it('should throw if no JWT key was provided', async () => {
    await check(false)
  })

  it('shoud throw an error if there is no user with such token', async () => {
    process.env.JWT = 'test_secret'
    const tokenOfNonexistentUser = await sign({
      email: 'alexanderrennenburg@gmail.com',
    })
    await check(false, tokenOfNonexistentUser)
  })

  it('shoud throw an error if the token is malformed', async () => {
    process.env.JWT = 'test_secret'
    await check(false, 'Invalid token')
  })

  it('shoud throw an error if the token is absent', async () => {
    process.env.JWT = 'test_secret'
    await check(false)
  })

  async function check(shouldSucceed: boolean, token?: string) {
    const mockThrow = jest.fn()
    const ctx: any = {
      throw: mockThrow,
      headers: {
        token,
      },
      state: {},
    }
    const mockNext = jest.fn()
    await authenticate(ctx, mockNext)
    expect(mockNext.mock.calls.length).toBe(shouldSucceed ? 1 : 0)
    expect(mockThrow.mock.calls.length).toBe(shouldSucceed ? 0 : 1)
    return ctx
  }
})

const user = {
  name: 'Alexander Brennenburg',
  email: 'alexanderrennenburg@gmail.com',
}
