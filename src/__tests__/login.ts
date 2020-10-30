import * as request from 'supertest'
import * as mongoose from 'mongoose'
import app from '@/app'
// import * as dbHandler from '@/__tests__/dbHandler';
import { MongoMemoryServer } from 'mongodb-memory-server'
import { runMongo } from '@/models/index'

describe('Something', () => {
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

  describe('Something', () => {
    it('should do something', async () => {
      expect('Something').toBe('Something')
    })
  })
})
