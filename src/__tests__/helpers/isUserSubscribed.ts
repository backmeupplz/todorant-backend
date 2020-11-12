import app from '@/app'
import { isUserSubscribed } from '@/helpers/isUserSubscribed'
import { runMongo } from '@/models/index'
import { UserModel } from '@/models/user'
import { MongoMemoryServer } from 'mongodb-memory-server'
import * as mongoose from 'mongoose'

describe('IsUserSubscribed', () => {
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

  it('should complete on a request from user with active subscription status', async () => {
    const user: any = {
      subscriptionStatus: 'active',
    }
    expect(isUserSubscribed(user)).toBe(true)
  })

  it('should fail on a request from user with inactive subscription status', async () => {
    const user: any = {
      subscriptionStatus: 'inactive',
    }
    expect(isUserSubscribed(user)).toBe(false)
  })

  it('should complete on a request from user with active trial subscription status', async () => {
    const user = await UserModel.create(userSubscriptionTrialActive)
    expect(isUserSubscribed(user)).toBe(true)
  })

  it('should fail on a request from user with inactive trial subscription status', async () => {
    const user = await UserModel.create(userSubscriptionTrialInactive)
    expect(isUserSubscribed(user)).toBe(false)
  })

  it('should complete on a request from user with early adopter subscription status', async () => {
    const user: any = {
      subscriptionStatus: 'earlyAdopter',
    }
    expect(isUserSubscribed(user)).toBe(true)
  })
})

const userSubscriptionTrialActive = {
  name: 'Alexander Brennenburg',
  email: 'alexanderrennenburg@gmail.com',
  subscriptionStatus: 'trial',
  token:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoiQWxleGFuZGVyIEJyZW5uZW5idXJnIiwic3Vic2NyaXB0aW9uU3RhdHVzIjoidHJpYWwiLCJkZWxlZ2F0ZUludml0ZVRva2VuIjoiR090WWwyRUVaSE1OMmF1cSIsImVtYWlsIjoiYWxleGFuZGVycmVubmVuYnVyZ0BnbWFpbC5jb20iLCJpYXQiOjE2MDUxMjY5MTF9.Z17DwU2HuIcqBgvrzl65X47q3iRMuvybbYLmz9yc5ns',
}

const userSubscriptionTrialInactive = {
  name: 'Anastasie Trianon',
  email: 'anastasietrianon@gmail.com',
  subscriptionStatus: 'trial',
  createdAt: new Date().setDate(new Date().getDate() - 31),
  token:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoiQW5hc3Rhc2llIFRyaWFub24iLCJzdWJzY3JpcHRpb25TdGF0dXMiOiJ0cmlhbCIsImRlbGVnYXRlSW52aXRlVG9rZW4iOiJDMVJ6Z051MVJLczluSEFVIiwiZW1haWwiOiJhbmFzdGFzaWV0cmlhbm9uQGdtYWlsLmNvbSIsImlhdCI6MTYwNTE5OTY5NX0.CNOdaBVs6VMon0KLPsQpGRuXOJSM_GaXVs8DVGaULmU',
}
