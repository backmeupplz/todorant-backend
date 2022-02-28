import { app } from '@/app'
import { runMongo, stopMongo } from '@/models/index'
import { getOrCreateUser } from '@/models/user'
import axios from 'axios'
import MockAdapter from 'axios-mock-adapter'
import { MongoMemoryServer } from 'mongodb-memory-server'
import * as request from 'supertest'
import {
  completeUser,
  dropMongo,
  startKoa,
  stopServer,
  FacebookApiSpy,
  verifyTelegramPayloadSpy,
} from '@/__tests__/testUtils'
import { Server } from 'http'

describe('Login endpoint', () => {
  const axiosMock = new MockAdapter(axios)
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

  it('should return user for valid /google request', async () => {
    await getOrCreateUser(completeUser)
    axiosMock
      .onGet('https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=test')
      .reply(200, {
        name: 'Alexander Brennenburg',
        email: 'alexanderrennenburg@gmail.com',
      })
    const response = await request(server)
      .post('/login/google')
      .send({ accessToken: 'test' })
    expect(response.body.name).toBe('Alexander Brennenburg')
    expect(response.body.email).toBe('alexanderrennenburg@gmail.com')
  })

  it('should return user for valid /google-firebase request', async () => {
    await getOrCreateUser(completeUser)
    axiosMock
      .onGet(`https://www.googleapis.com/oauth2/v3/userinfo`, {
        headers: {
          Authorization: `Bearer test`,
        },
      })
      .reply(200, {
        name: 'Alexander Brennenburg',
        email: 'alexanderrennenburg@gmail.com',
      })
    const response = await request(server)
      .post('/login/google-firebase')
      .send({ accessToken: 'test' })
    expect(response.body.name).toBe('Alexander Brennenburg')
    expect(response.body.email).toBe('alexanderrennenburg@gmail.com')
  })

  it('should return user for valid /anonymous request', async () => {
    const response = await request(server).post('/login/anonymous').send()
    expect(response.body.name).toBe('Anonymous user')
  })

  it('should return user for valid /token request', async () => {
    const user = (await getOrCreateUser(completeUser)).user
    const response = await request(server)
      .post('/login/token')
      .send({ token: user.token })
    expect(response.body.name).toBe('Alexander Brennenburg')
    expect(response.body.email).toBe('alexanderrennenburg@gmail.com')
  })

  it('should return user for valid /facebook request', async () => {
    FacebookApiSpy.mockImplementation((str: string, fn: Function) => {
      const err = false
      const user = {
        name: 'Alexander Brennenburg',
        email: 'alexanderrennenburg@gmail.com',
        id: '12345',
      }
      fn(err, user)
    })
    const response = await request(server)
      .post('/login/facebook')
      .send({ accessToken: 'test' })
    expect(response.body.name).toBe('Alexander Brennenburg')
    expect(response.body.email).toBe('alexanderrennenburg@gmail.com')
    expect(response.body.facebookId).toBe('12345')
  })

  it('should return user for valid /telegram request', async () => {
    verifyTelegramPayloadSpy.mockImplementation((data) => {
      return data
    })
    const response = await request(server).post('/login/telegram').send({
      id: 12345,
      hash: 'string',
      auth_date: '2022-02-02',
      first_name: 'Alexander',
      last_name: 'Brennenburg',
    })
    expect(response.body.name).toBe('Alexander Brennenburg')
    expect(response.body.telegramId).toBe('12345')
  })
})
