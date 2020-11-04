import * as request from 'supertest'
import app from '@/app'

describe('Docs', () => {
  afterAll(async () => app.close())

  test('docs route test', async () => {
    const response = await request(app).get('/md')
    expect(response.status).toBe(200)
  })
})
