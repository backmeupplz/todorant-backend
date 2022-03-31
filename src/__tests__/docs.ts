import * as request from 'supertest'
import { Server } from 'http'
import { app } from '@/app'
import { startKoa, stopServer } from '@/__tests__/testUtils'

describe('Docs endpoint', () => {
  let server: Server

  beforeAll(async () => {
    server = await startKoa(app)
  })

  afterAll(async () => {
    await stopServer(server)
  })

  it('should respond to docs md endpoint with 200', async () => {
    const response = await request(server).get('/md')
    expect(response.status).toBe(200)
  })
})
