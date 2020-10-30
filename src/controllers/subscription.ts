import { Controller, Ctx, Flow, Get, Post } from 'koa-ts-controllers'
import { Context } from 'koa'
import { authenticate } from '@/middlewares/authenticate'
import Stripe from 'stripe'
import { User } from '@/models/user'
import { UserModel, SubscriptionStatus } from '@/models/user'

const stripe = new Stripe(process.env.STRIPE_SECRET, {
  apiVersion: '2020-08-27',
})

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
      locale: locale,
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
    await stripe.subscriptions.del(subscriptionId)
    // Respond
    ctx.status = 200
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
    ctx.status = 200
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
      return { received: true }
    } catch (err) {
      return ctx.throw(400, `Webhook Error: ${err.message}`)
    }
  }
}
