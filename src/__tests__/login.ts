import * as request from 'supertest'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { QrLoginModel } from '@/models/QrLoginModel'
import { Server } from 'http'
import { User, UserModel, getOrCreateUser } from '@/models/user'
import {
  accessTokenSpy,
  botGetChatSpy,
  botSendMessageSpy,
  completeUser,
  decodeSpy,
  dropMongo,
  facebookApiSpy,
  startKoa,
  stopServer,
  transformToBeEqual,
  verifyAppleTokenSpy,
  verifyTelegramPayloadSpy,
} from '@/__tests__/testUtils'
import { app } from '@/app'
import { runMongo, stopMongo } from '@/models/index'
import { telegramLoginRequests } from '@/controllers/login'
import { v4 as uuid } from 'uuid'
import MockAdapter from 'axios-mock-adapter'
import axios from 'axios'

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
    facebookApiSpy.mockImplementation((st, fn: (boolean, User) => void) => {
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
    const { created, user } = await getOrCreateUser({
      name: 'Default Name',
      facebookId: '12345',
    })
    const strippedUser = user.stripped(true) as User
    expect(created || !user).toBe(false)
    expect(response.body).toStrictEqual(transformToBeEqual(strippedUser))
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
    const { created, user } = await getOrCreateUser({
      name: 'Default Name',
      telegramId: '12345',
    })
    const strippedUser = user.stripped(true) as User
    expect(created || !user).toBe(false)
    expect(response.body).toStrictEqual(transformToBeEqual(strippedUser))
  })

  it('should return user for valid /google request', async () => {
    axiosMock
      .onGet('https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=test')
      .reply(200, {
        name: 'Default Name',
        email: 'defaultname@gmail.com',
      })
    const response = await request(server)
      .post('/login/google')
      .send({ accessToken: 'test' })
    const { created, user } = await getOrCreateUser({
      name: 'Default Name',
      email: 'defaultname@gmail.com',
    })
    const strippedUser = user.stripped(true) as User
    expect(created || !user).toBe(false)
    expect(response.body).toStrictEqual(transformToBeEqual(strippedUser))
  })

  it('should return user for valid /google-firebase request', async () => {
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
    const { created, user } = await getOrCreateUser({
      name: 'Default Name',
      email: 'defaultname@gmail.com',
    })
    const strippedUser = user.stripped(true) as User
    expect(created || !user).toBe(false)
    expect(response.body).toStrictEqual(transformToBeEqual(strippedUser))
  })

  it('should return user for valid /anonymous request', async () => {
    const response = await request(server).post('/login/anonymous').send()
    const { created, user } = await getOrCreateUser({
      name: 'Default Name',
      anonymousToken: response.body.anonymousToken,
    })
    const strippedUser = user.stripped(true) as User
    expect(created || !user).toBe(false)
    expect(response.body).toStrictEqual(transformToBeEqual(strippedUser))
  })

  it('should return user for valid /apple request', async () => {
    accessTokenSpy.mockImplementation(
      () =>
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
    decodeSpy.mockImplementation(() => {
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
    const user = await UserModel.findOne({
      appleSubId: 'honey',
    })
    const strippedUser = user.stripped(true) as User
    expect(!user).toBe(false)
    expect(response1.body).toStrictEqual({
      ...strippedUser,
      delegatesUpdatedAt: strippedUser.delegatesUpdatedAt.toJSON(),
      createdAt: strippedUser.createdAt.toJSON(),
      updatedAt: strippedUser.updatedAt.toJSON(),
      _id: strippedUser._id.toString(),
    })
    expect(response2.body).toStrictEqual(transformToBeEqual(strippedUser))
  })

  it('should return user for valid /apple-firebase request', async () => {
    verifyAppleTokenSpy.mockImplementation(async () => {
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
    const user = await UserModel.findOne({
      appleSubId: 'honey',
    })
    const strippedUser = user.stripped(true) as User
    expect(!user).toBe(false)
    expect(response.body).toStrictEqual(transformToBeEqual(strippedUser))
  })

  it('should return user for valid /telegram-mobile request', async () => {
    const qrUuid = uuid()
    await new QrLoginModel({ uuid: qrUuid }).save()
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
    botSendMessageSpy.mockImplementation((id: number, text) => {
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
    const loginRequest = telegramLoginRequests[qrUuid]
    const { created, user } = await getOrCreateUser({
      name: 'Default Name',
      telegramId: '12345',
    })
    const strippedUser = user.stripped(true) as User
    expect(created || !user).toBe(false)
    expect(loginRequest.user).toStrictEqual(strippedUser)
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
    telegramLoginRequests[qrUuid] = {
      user: user.stripped(true) as User,
      allowed: true,
    }
    const response = await request(server)
      .post('/login/telegram_mobile_check')
      .send({
        uuid: qrUuid,
      })
    const strippedUser = telegramLoginRequests[qrUuid].user
    expect(response.body.user).toStrictEqual(transformToBeEqual(strippedUser))
  })

  it('should return user for valid /token request', async () => {
    const { user } = await getOrCreateUser(completeUser)
    const response = await request(server)
      .post('/login/token')
      .send({ token: user.token })
    const strippedUser = user.stripped(true) as User
    expect(response.body).toStrictEqual(transformToBeEqual(strippedUser))
  })

  it('should redirect and return success for valid /apple_login_result request', async () => {
    const response = await request(server)
      .post('/login/apple_login_result')
      .send({ id_token: 'honey', user: 'Default Name' })
    expect(response.header.location).toBe(
      'https://todorant.com/#/apple_login_result#?id_token=honey&user=%22Default%20Name%22'
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
    expect(response.body).toStrictEqual({ token })
  })
})
