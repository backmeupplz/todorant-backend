import { Controller, Get, Post } from 'koa-router-ts'
import { Context } from 'koa'
import { authenticate } from '../middlewares/authenticate'
import Stripe from 'stripe'
import { User } from '../models/user'
import { UserModel, SubscriptionStatus } from '../models'

const stripe = new Stripe(process.env.STRIPE_SECRET, {
  apiVersion: '2020-03-02',
})

@Controller('/subscription')
export default class {
  @Get('/session/:plan', authenticate)
  async getPlanning(ctx: Context) {
    // Parameters
    const plan = ctx.params.plan
    const plans = ['yearly', 'monthly']
    if (!plans.includes(plan)) {
      return ctx.throw(403)
    }
    const planMap = {
      monthly: process.env.STRIPE_MONTHLY,
      yearly: process.env.STRIPE_YEARLY,
    }
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      subscription_data: { items: [{ plan: planMap[plan] }] },
      success_url: `${process.env.BASE_URL}/payment_success`,
      cancel_url: `${process.env.BASE_URL}/payment_failure`,
      client_reference_id: ctx.state.user.id,
    })
    // Respond
    ctx.body = {
      session: session.id,
    }
  }

  @Post('/cancel', authenticate)
  async cancelSubscription(ctx: Context) {
    // Delete susbcription
    const subscriptionId = ctx.state.user.subscriptionId
    await stripe.subscriptions.del(subscriptionId)
    // Respond
    ctx.status = 200
  }

  @Get('/manageUrl', authenticate)
  async manageSubscriptionUrl(ctx: Context) {
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
    ctx.body = {
      url,
    }
    ctx.status = 200
  }

  @Post('/webhook')
  async webhook(ctx: Context) {
    try {
      // Construct event
      const event = stripe.webhooks.constructEvent(
        ctx.request.rawBody,
        ctx.headers['stripe-signature'],
        process.env.STRIPE_SIGNING_SECRET
      )
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
        user.subscriptionId = anyData.subscription
        if (user.subscriptionStatus !== SubscriptionStatus.earlyAdopter) {
          user.subscriptionStatus = SubscriptionStatus.active
        }
        await user.save()
      }
      // Respond
      ctx.body = { received: true }
    } catch (err) {
      return ctx.throw(400, `Webhook Error: ${err.message}`)
    }
  }
}
