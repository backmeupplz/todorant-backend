import * as request from 'supertest'
import * as mongoose from 'mongoose'
import app from '@/app'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { runMongo } from '@/models/index'

describe('Login', () => {
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

  test('google login route test', async () => {
    const response = await request(app)
      .post('/login/google')
      .send({ accessToken: 'test' })
    expect(response.body.name).toBe('Alexander Brennenburg')
    expect(response.body.email).toBe('alexanderrennenburg@gmail.com')
  })
})
