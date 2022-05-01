import * as request from 'supertest'
import { DocumentType } from '@typegoose/typegoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { Server } from 'http'
import { User, UserModel } from '@/models/user'
import { app } from '@/app'
import {
  completeUser,
  dropMongo,
  startKoa,
  stopServer,
} from '@/__tests__/testUtils'
import { runMongo, stopMongo } from '@/models/index'
import { sign } from '@/helpers/jwt'
import MockAdapter from 'axios-mock-adapter'
import axios from 'axios'

// let to test all varients in /webhook:
//customer.subscription.deleted and checkout.session.completed
export const webhookEvents = ['deleted', 'completed']

// Help to use userId for new user for in mock of the stripe
let userId

describe('Testing delegate controller', () => {
  new MockAdapter(axios)
  let server: Server
  let user: DocumentType<User>

  beforeAll(async () => {
    const mongoServer = new MongoMemoryServer()
    await runMongo(await mongoServer.getUri())
    server = await startKoa(app)
  })

  beforeEach(async () => {
    await dropMongo()
    const tokenDelegator = await sign(completeUser)
    user = await UserModel.create({
      ...completeUser,
      token: tokenDelegator,
      subscriptionId: '3f32t2eg3r3gefg4ej4km5m',
    })
  })

  afterAll(async () => {
    await stopMongo()
    await stopServer(server)
  })

  it('should to return session id', async () => {
    const planMounth = 'monthly'
    const dueId =
      'cs_test_a1r0BDAr6ti7PEU61HJjihSVRvSqDllJtCEWkW28TFNINJ28e4N63N211Q'
    let response = await request(server)
      .post('/subscription/session/' + planMounth)
      .set('token', user.token)
      .set('Accept', 'application/json')
      .send({ locale: 'ru' })
      .expect(200)
    expect(JSON.parse(response.text).session).toBe(dueId)
    response = await request(server)
      .post('/subscription/session/' + planMounth)
      .set('token', user.token)
      .set('Accept', 'application/json')
      .send({ locale: '' })
      .expect(200)
    expect(JSON.parse(response.text).session).toBe(dueId)
  })

  it('should to return 403 error', async () => {
    const planMounth = 'day'
    await request(server)
      .post('/subscription/session/' + planMounth)
      .set('token', user.token)
      .set('Accept', 'application/json')
      .send({ locale: 'ru' })
      .expect(403)

    await request(server)
      .post('/subscription/session/' + planMounth)
      .set('token', user.token)
      .set('Accept', 'application/json')
      .send({ locale: '' })
      .expect(403)
  })

  it('should to return 204 status code', async () => {
    await request(server)
      .post('/subscription/cancel/')
      .set('token', user.token)
      .set('Accept', 'application/json')
      .expect(204)
  })

  it('should to return 404 status code', async () => {
    const wrongId = '3ffdb35b3h35weg4353b53'
    user.subscriptionId = wrongId
    await user.save()
    await request(server)
      .post('/subscription/cancel/')
      .set('token', user.token)
      .set('Accept', 'application/json')
      .expect(404)
    user.subscriptionId = undefined
    await user.save()
    await request(server)
      .post('/subscription/cancel/')
      .set('token', user.token)
      .set('Accept', 'application/json')
      .expect(404)
  })

  it('should to return manage url', async () => {
    const newUrl = await request(server)
      .get('/subscription/manageUrl/')
      .set('token', user.token)
      .set('Accept', 'application/json')
      .expect(200)
    expect(JSON.parse(newUrl.text).url).toBe('https://newurl.com')
  })

  it('should to return 404, subscriptionId is undefined', async () => {
    user.subscriptionId = undefined
    await user.save()
    await request(server)
      .get('/subscription/manageUrl/')
      .set('token', user.token)
      .set('Accept', 'application/json')
      .expect(404)
  })

  it('webhook should to return true (received)', async () => {
    userId = user._id
    let response
    response = await request(server)
      .post('/subscription/webhook/')
      .set('token', user.token)
      .set('Accept', 'application/json')
    expect(JSON.parse(response.text).received).toBe(true)
    user.subscriptionId = undefined
    await user.save()
    response = await request(server)
      .post('/subscription/webhook/')
      .set('token', user.token)
      .set('Accept', 'application/json')
    expect(JSON.parse(response.text).received).toBe(true)
  })

  it('webhook should to return 400 error', async () => {
    const wrongId = '3f32t3rt3r3gefg4ej4km5m'
    user.subscriptionId = wrongId
    await user.save()
    await request(server)
      .post('/subscription/webhook/')
      .set('token', user.token)
      .set('Accept', 'application/json')
      .expect(400)
    await UserModel.deleteOne({ _id: user._id })
    await request(server)
      .post('/subscription/webhook/')
      .set('token', user.token)
      .set('Accept', 'application/json')
      .expect(400)
  })
})

jest.mock('@/helpers/stripe', () => {
  return {
    __esModule: true,
    stripe: {
      checkout: {
        sessions: {
          create: jest.fn(() => {
            return new Promise((res) =>
              res({
                id: 'cs_test_a1r0BDAr6ti7PEU61HJjihSVRvSqDllJtCEWkW28TFNINJ28e4N63N211Q',
                object: 'checkout.session',
                after_expiration: null,
                allow_promotion_codes: null,
              })
            )
          }),
        },
      },
      subscriptions: {
        del: jest.fn((subscriptionId) => {
          return new Promise((res, rej) => {
            const testId = '3f32t2eg3r3gefg4ej4km5m'
            if (subscriptionId == testId) {
              res(true)
            } else {
              rej(new Error('Id is undefind'))
            }
          })
        }),
        retrieve: jest.fn(() => {
          return new Promise((res) => {
            const customer = '32f42v53y53ht453gh'
            res({ customer })
          })
        }),
      },
      billingPortal: {
        sessions: {
          create: jest.fn(() => {
            return new Promise((res) => {
              const url = 'https://newurl.com'
              res({ url })
            })
          }),
        },
      },
      webhooks: {
        constructEvent: jest.fn(() => {
          if (webhookEvents[0] == 'deleted') {
            const eventDataForDeleted = {
              type: 'customer.subscription.deleted',
              data: { object: { id: '3f32t2eg3r3gefg4ej4km5m' } },
            }
            webhookEvents.shift()
            return eventDataForDeleted
          } else if (webhookEvents[0] == 'completed') {
            const eventDataForCompleted = {
              type: 'checkout.session.completed',
              data: {
                object: {
                  client_reference_id: userId,
                  subscription: '3f32t2eg3r5jyfg4ej4km5m',
                },
              },
            }
            return eventDataForCompleted
          }
        }),
      },
    },
  }
})
