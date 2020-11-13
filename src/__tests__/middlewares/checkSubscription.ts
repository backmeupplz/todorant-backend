import { checkSubscription } from '@/middlewares/checkSubscription'

describe('Subscription middleware', () => {
  it('should continue on a request from a subscribed user', async () => {
    const ctx: any = {
      state: { user: userSubscriptionActive },
    }
    const mockNext = jest.fn()
    await checkSubscription(ctx, mockNext)
    expect(mockNext.mock.calls.length).toBe(1)
  })

  it('should fail on a request from an unsubscribed user', async () => {
    const mockThrow = jest.fn()
    const ctx: any = {
      state: {
        user: userSubscriptionInactive,
      },
      throw: mockThrow,
    }
    const mockNext = jest.fn()
    await checkSubscription(ctx, mockNext)
    expect(mockNext.mock.calls.length).toBe(0)
    expect(mockThrow.mock.calls.length).toBe(1)
  })
})

const userSubscriptionActive = {
  name: 'Alexander Brennenburg',
  email: 'alexanderrennenburg@gmail.com',
  subscriptionStatus: 'active',
  token:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoiQWxleGFuZGVyIEJyZW5uZW5idXJnIiwic3Vic2NyaXB0aW9uU3RhdHVzIjoidHJpYWwiLCJkZWxlZ2F0ZUludml0ZVRva2VuIjoiR090WWwyRUVaSE1OMmF1cSIsImVtYWlsIjoiYWxleGFuZGVycmVubmVuYnVyZ0BnbWFpbC5jb20iLCJpYXQiOjE2MDUxMjY5MTF9.Z17DwU2HuIcqBgvrzl65X47q3iRMuvybbYLmz9yc5ns',
}

const userSubscriptionInactive = {
  name: 'Anastasie Trianon',
  email: 'anastasietrianon@gmail.com',
  subscriptionStatus: 'inactive',
  token:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoiQW5hc3Rhc2llIFRyaWFub24iLCJzdWJzY3JpcHRpb25TdGF0dXMiOiJ0cmlhbCIsImRlbGVnYXRlSW52aXRlVG9rZW4iOiJDMVJ6Z051MVJLczluSEFVIiwiZW1haWwiOiJhbmFzdGFzaWV0cmlhbm9uQGdtYWlsLmNvbSIsImlhdCI6MTYwNTE5OTY5NX0.CNOdaBVs6VMon0KLPsQpGRuXOJSM_GaXVs8DVGaULmU',
}
