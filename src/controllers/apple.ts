import { Context } from 'koa'
import { Controller, Ctx, Flow, Get, Post } from 'koa-ts-controllers'
import { SubscriptionStatus } from '@/models/user'
import { authenticate } from '@/middlewares/authenticate'
import { bot, report } from '@/helpers/report'
import { subscriptionVerifier } from '@/helpers/subscriptionVerifier'

@Controller('/apple')
export default class AppleController {
  @Get('/')
  firefoxBug(@Ctx() ctx: Context) {
    ctx.redirect(`https://todorant.com/apple_firefox_error`)
    return 'Success!'
  }

  @Post('/subscription')
  @Flow(authenticate)
  async subscription(@Ctx() ctx: Context) {
    try {
      const response = await subscriptionVerifier.validateApple(
        ctx.request.body.receipt
      )
      const latestReceipt = response.latest_receipt
      const latestReceiptInfo = response.latest_receipt_info
      // Get latest
      let latestSubscription = 0
      let hasPerpetualPurchase = false
      for (const info of latestReceiptInfo) {
        if (info.product_id === 'perpetual') {
          hasPerpetualPurchase = true
          break
        }
        if (+info.expires_date_ms > latestSubscription) {
          latestSubscription = +info.expires_date_ms
        }
      }
      // Check status
      if (hasPerpetualPurchase) {
        ctx.state.user.subscriptionStatus = SubscriptionStatus.active
        ctx.state.user.isPerpetualLicense = true
      } else {
        const subscriptionIsActive = new Date().getTime() < latestSubscription
        if (subscriptionIsActive) {
          ctx.state.user.subscriptionStatus = SubscriptionStatus.active
        }
      }
      ctx.state.user.appleReceipt = latestReceipt
      await ctx.state.user.save()
      ctx.status = 200
    } catch (err) {
      report(
        err,
        `${JSON.stringify(ctx.body)}${test ? JSON.stringify(test) : ''}`
      )
      throw err
    }
  }

  @Post('/subscriptionNotification-FgA3JNgNy49dNnrVaQ9PCKGJ')
  async subscriptionNotification(@Ctx() ctx: Context) {
    const body = ctx.request.body
    if (!body || body.notification_type !== 'CANCEL') {
      return
    }
    await bot.telegram.sendMessage(76104711, `Got cancel event from Apple`)
  }
}
