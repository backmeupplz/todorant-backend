import { app } from '@/app'
import { runMongo, stopMongo } from '@/models/index'
import { getOrCreateUser } from '@/models/user'
import axios from 'axios'
import MockAdapter from 'axios-mock-adapter'
import { MongoMemoryServer } from 'mongodb-memory-server'
import * as request from 'supertest'
import { v4 as uuid } from 'uuid'
import {
  verifyTelegramPayloadSpy,
  verifyAppleTokenSpy,
  facebookApiSpy,
  accessTokenSpy,
  completeUser,
  stopServer,
  dropMongo,
  decodeSpy,
  startKoa,
  botGetChatSpy,
  botSendMessageSpy,
} from '@/__tests__/testUtils'
import { Server } from 'http'
import { QrLoginModel } from '@/models/QrLoginModel'
import { bot } from '@/helpers/telegram'
import { telegramLoginRequests } from '@/controllers/login'

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

  it('should return user for valid /facebook request', async () => {
    facebookApiSpy.mockImplementation((st, fn: Function) => {
      const user = {
        name: 'Default Name',
        email: 'defaultname@gmail.com',
        id: '12345',
      }
      fn(false, user)
    })
    const response = await request(server)
      .post('/login/facebook')
      .send({ accessToken: 'test' })
    expect(response.body.name).toBe('Default Name')
    expect(response.body.email).toBe('defaultname@gmail.com')
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
      first_name: 'Default',
      last_name: 'Name',
    })
    expect(response.body.name).toBe('Default Name')
    expect(response.body.telegramId).toBe('12345')
  })

  it('should return user for valid /google request', async () => {
    await getOrCreateUser(completeUser)
    axiosMock
      .onGet('https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=test')
      .reply(200, {
        name: 'Default Name',
        email: 'defaultname@gmail.com',
      })
    const response = await request(server)
      .post('/login/google')
      .send({ accessToken: 'test' })
    expect(response.body.name).toBe('Default Name')
    expect(response.body.email).toBe('defaultname@gmail.com')
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
        name: 'Default Name',
        email: 'defaultname@gmail.com',
      })
    const response = await request(server)
      .post('/login/google-firebase')
      .send({ accessToken: 'test' })
    expect(response.body.name).toBe('Default Name')
    expect(response.body.email).toBe('defaultname@gmail.com')
  })

  it('should return user for valid /anonymous request', async () => {
    const response = await request(server).post('/login/anonymous').send()
    expect(response.body.name).toBe('Anonymous user')
  })

  it('should return user for valid /apple request', async () => {
    accessTokenSpy.mockImplementation(
      (code) =>
        new Promise((resolve) =>
          resolve({
            expires_in: 31415,
            access_token: 'berry',
            refresh_token: 'cute',
            id_token: 'sweet',
            token_type: 'bearer',
          })
        )
    )
    axiosMock.onGet('https://appleid.apple.com/auth/token').reply(200)
    decodeSpy.mockImplementation((id_token) => {
      return {
        sub: 'honey',
        email: 'defaultname@gmail.com',
      }
    })
    const response1 = await request(server)
      .post('/login/apple')
      .send({
        user: {
          name: {
            firstName: 'Default',
            lastName: 'Name',
          },
        },
        code: {
          _config: { redirect_uri: 'a.a', client_id: 'b.b' },
        },
        client: 'ios',
        fromApple: true,
      })
    const response2 = await request(server)
      .post('/login/apple')
      .send({
        code: {
          _config: { redirect_uri: 'a.a', client_id: 'b.b' },
        },
        client: 'ios',
        fromApple: true,
      })
    expect(response1.body.name).toBe('Default Name')
    expect(response1.body.email).toBe('defaultname@gmail.com')
    expect(response2.body.name).toBe('Default Name')
    expect(response2.body.email).toBe('defaultname@gmail.com')
  })

  it('should return user for valid /apple-firebase request', async () => {
    verifyAppleTokenSpy.mockImplementation(async (id_token) => {
      return {
        sub: 'honey',
        email: 'defaultname@gmail.com',
      }
    })
    const response = await request(server)
      .post('/login/apple-firebase')
      .send({
        name: 'Default Name',
        credential: {
          oauthIdToken: 'cute',
        },
      })
    expect(response.body.name).toBe('Default Name')
    expect(response.body.email).toBe('defaultname@gmail.com')
  })

  it('should return user for valid /telegram-mobile request', async () => {
    const { user } = await getOrCreateUser(completeUser)
    const qrUuid = uuid()
    await new QrLoginModel({ uuid: qrUuid }).save()
    await QrLoginModel.findOneAndUpdate({ uuid: qrUuid }, { token: user.token })
    const tgChat = {
      type: 'private',
      first_name: 'Default',
      last_name: 'Name',
    }
    botGetChatSpy.mockImplementation((id: number) => {
      return new Promise((resolve) => {
        return resolve({
          id,
          ...tgChat,
        })
      })
    })
    botSendMessageSpy.mockImplementation((id: number, text, extra) => {
      return new Promise((resolve) => {
        return resolve({
          message_id: id,
          date: 3141529,
          chat: {
            id,
            ...tgChat,
          },
          text,
        })
      })
    })
    const response = await request(server).post('/login/telegram_mobile').send({
      id: 12345,
      uuid: qrUuid,
    })
    expect(response.status).toBe(204)
    expect(botGetChatSpy).toHaveBeenCalledWith(12345)
    expect(botGetChatSpy).toHaveReturned()
    expect(botSendMessageSpy).toHaveBeenCalled()
    expect(botSendMessageSpy).toHaveReturned()
  })

  it('should return user for valid /telegram_mobile_check request', async () => {
    const { user } = await getOrCreateUser(completeUser)
    const qrUuid = uuid()
    await new QrLoginModel({ uuid: qrUuid }).save()
    await QrLoginModel.findOneAndUpdate({ uuid: qrUuid }, { token: user.token })
    telegramLoginRequests[qrUuid] = { user, allowed: true }
    const response = await request(server)
      .post('/login/telegram_mobile_check')
      .send({
        id: 12345,
        uuid: qrUuid,
      })
    expect(response.body.user.name).toBe('Default Name')
    expect(response.body.user.email).toBe('defaultname@gmail.com')
  })

  it('should return user for valid /token request', async () => {
    const { user } = await getOrCreateUser(completeUser)
    const response = await request(server)
      .post('/login/token')
      .send({ token: user.token })
    expect(response.body.name).toBe('Default Name')
    expect(response.body.email).toBe('defaultname@gmail.com')
  })

  it('should return success for valid /apple_login_result request', async () => {
    const response = await request(server)
      .post('/login/apple_login_result')
      .send({ id_token: 'honey', user: 'Default Name' })
    expect(response.header.location).toBe(
      'https://todorant.com/apple_login_result#?id_token=honey&user=%22Default%20Name%22'
    )
    expect(response.text).toBe('Success!')
  })

  it('should return uuid for valid /generate_uuid request', async () => {
    const response = await request(server).get('/login/generate_uuid').send()
    expect(response.body.uuid).toBeDefined()
  })

  it('should update uuid for valid /qr_token request', async () => {
    const { token } = (await getOrCreateUser(completeUser)).user
    const qrUuid = uuid()
    await new QrLoginModel({ uuid: qrUuid }).save()
    const result = await request(server)
      .post('/login/qr_token')
      .set('token', token)
      .send({ uuid: qrUuid })
    expect((await QrLoginModel.findOne({ uuid: qrUuid })).token).toBe(token)
    expect(result.status).toBe(204)
  })

  it('should return token for valid /qr_check request', async () => {
    const { token } = (await getOrCreateUser(completeUser)).user
    const qrUuid = uuid()
    await new QrLoginModel({ uuid: qrUuid }).save()
    await QrLoginModel.findOneAndUpdate({ uuid: qrUuid }, { token })
    const response = await request(server)
      .post('/login/qr_check')
      .send({ uuid: qrUuid })
    expect(response.body.token).toBe(token)
  })
})
