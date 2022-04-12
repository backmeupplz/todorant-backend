import { MongoMemoryServer } from 'mongodb-memory-server'
import { Server } from 'http'
import { app } from '@/app'
import { dropMongo, startKoa, stopServer } from '@/__tests__/testUtils'
import { runMongo, stopMongo } from '@/models/index'
import { verifyTelegramPayload } from '@/helpers/verifyTelegramPayload'
import MockAdapter from 'axios-mock-adapter'
import axios from 'axios'

describe('Testing delegate controller', () => {
  new MockAdapter(axios)
  let server: Server
  let TelegramPayload

  beforeAll(async () => {
    const mongoServer = new MongoMemoryServer()
    await runMongo(await mongoServer.getUri())
    server = await startKoa(app)
  })

  beforeEach(async () => {
    await dropMongo()
    TelegramPayload = {
      id: 123124125,
      hash: 'hash at string',
      auth_date: '14.07.2020',
      first_name: 'Semion',
      last_name: 'Babak',
      username: 'mrbabak',
      photo_url: 'https://user_photo_url.com',
    }
  })

  afterAll(async () => {
    await stopMongo()
    await stopServer(server)
  })

  it('should to return false', async () => {
    const checkPayload = verifyTelegramPayload(TelegramPayload)
    expect(checkPayload).toBe(false)
  })

  it('should to return TelegramLoginPayload', async () => {
    TelegramPayload.hash =
      '3bcbf02d81b29777a34c18526af3c611dbf963b5b9ea88187003a3a4c760ee25'
    const checkPayload = verifyTelegramPayload(TelegramPayload)
    expect(checkPayload).toBe(TelegramPayload)
  })
})
