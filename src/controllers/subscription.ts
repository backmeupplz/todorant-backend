import { Context } from 'koa'
import { Controller, Ctx, Flow, Get, Post } from 'koa-ts-controllers'
import { SubscriptionStatus, UserModel } from '@/models/user'
import { User } from '@/models/user'
import { authenticate } from '@/middlewares/authenticate'
import { getUserId, webhookEvents } from '@/__tests__/subscription'
import { stripe } from '@/helpers/stripe'

@Controller('/subscription')
export default class SubscriptionController {
  @Post('/session/:plan')
  @Flow(authenticate)
  async getPlanning(@Ctx() ctx: Context) {
    const locales = ['de', 'en', 'es', 'it', 'pt-BR', 'ru']
    let locale = ctx.request.body.locale
    if (!locales.includes(locale)) {
      locale = 'auto'
    }
    // Parameters
    const plan = ctx.params.plan
    const planMap = {
      monthly: process.env.STRIPE_MONTHLY,
      yearly: process.env.STRIPE_YEARLY,
      perpetual: process.env.STRIPE_PERPETUAL,
    }

    if (!Object.keys(planMap).includes(plan)) {
      return ctx.throw(403)
    }
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: planMap[plan],
          quantity: 1,
        },
      ],
      success_url: `${process.env.BASE_URL}/payment_success`,
      cancel_url: `${process.env.BASE_URL}/payment_failure`,
      client_reference_id: ctx.state.user.id,
      locale: locale,
      mode: plan === 'perpetual' ? 'payment' : 'subscription',
      allow_promotion_codes: true,
    })
    // Respond
    return {
      session: session.id,
    }
  }

  @Post('/cancel')
  @Flow(authenticate)
  async cancelSubscription(@Ctx() ctx: Context) {
    // Delete susbcription
    const subscriptionId = ctx.state.user.subscriptionId
    if (!subscriptionId) {
      return ctx.throw(404)
    }
    try {
      await stripe.subscriptions.del(subscriptionId)
    } catch (err) {
      return ctx.throw(404)
    }
  }

  @Get('/manageUrl')
  @Flow(authenticate)
  async manageSubscriptionUrl(@Ctx() ctx: Context) {
    const user = ctx.state.user as User
    if (!user.subscriptionId) {
      return ctx.throw(404)
    }
    const subscription = await stripe.subscriptions.retrieve(
      user.subscriptionId as string
    )
    const customerId = subscription.customer as string
    const url = (
      await stripe.billingPortal.sessions.create({
        customer: customerId,
      })
    ).url
    return {
      url,
    }
  }

  @Post('/webhook')
  async webhook(@Ctx() ctx: Context) {
    try {
      // Construct event
      const event = stripe.webhooks.constructEvent(
        ctx.request.rawBody,
        ctx.headers['stripe-signature'],
        process.env.STRIPE_SIGNING_SECRET
      )
      console.log(2.1, event)
      // Handle event
      if (event.type === 'customer.subscription.deleted') {
        const anyData = event.data.object as any
        const subscriptionId = anyData.id
        const user = await UserModel.findOne({ subscriptionId })
        if (!user) {
          return ctx.throw(
            400,
            `Webhook Error: No user found for subscription id ${subscriptionId}`
          )
        }
        user.subscriptionId = undefined
        if (user.subscriptionStatus !== SubscriptionStatus.earlyAdopter) {
          user.subscriptionStatus = SubscriptionStatus.inactive
        }
        await user.save()
      } else if (event.type === 'checkout.session.completed') {
        const anyData = event.data.object as any
        const userId = anyData.client_reference_id
        const user = await UserModel.findById(userId)
        if (!user) {
          return ctx.throw(
            400,
            `Webhook Error: No user found with id ${userId}`
          )
        }
        if (anyData.mode === 'subscription') {
          user.subscriptionId = anyData.subscription
          if (user.subscriptionStatus !== SubscriptionStatus.earlyAdopter) {
            user.subscriptionStatus = SubscriptionStatus.active
          }
        } else {
          user.isPerpetualLicense = true
          if (user.subscriptionStatus !== SubscriptionStatus.earlyAdopter) {
            user.subscriptionStatus = SubscriptionStatus.active
          }
        }
        await user.save()
      }
      // Respond
      return { received: true }
    } catch (err) {
      return ctx.throw(400, `Webhook Error: ${err.message}`)
    }
  }
}

// Testing mock
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
            const userId = getUserId()
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
