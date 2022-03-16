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
}

const userSubscriptionInactive = {
  name: 'Anastasie Trianon',
  email: 'anastasietrianon@gmail.com',
  subscriptionStatus: 'inactive',
}
