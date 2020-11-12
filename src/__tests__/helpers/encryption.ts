import app from '@/app'
import { _d, _e } from '@/helpers/encryption'
import { runMongo } from '@/models/index'
import { MongoMemoryServer } from 'mongodb-memory-server'
import * as mongoose from 'mongoose'

describe('Encryption', () => {
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

  test('correct password', async () => {
    const text = 'some text'
    const password = 'test'
    const encrypted = _e(text, password)
    const decrypted = _d(encrypted, password)
    expect(decrypted).toBe(text)
  })

  test('wrong password', async () => {
    const text = 'some text'
    const password = 'test'
    const encrypted = _e(text, password)
    const decrypted = _d(encrypted, 'wrongPassword')
    expect(decrypted).toBe('')
  })
})
