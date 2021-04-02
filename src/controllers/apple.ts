import { Controller, Ctx, Flow, Get, Post } from 'koa-ts-controllers'
import { Context } from 'koa'
import { authenticate } from '@/middlewares/authenticate'
import axios from 'axios'
import { SubscriptionStatus } from '@/models/user'
import { bot, report } from '@/helpers/report'

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
      const appleUrl =
        process.env.ENVIRONMENT === 'staging'
          ? 'https://sandbox.itunes.apple.com/verifyReceipt'
          : 'https://buy.itunes.apple.com/verifyReceipt'
      const password = process.env.APPLE_SECRET
      const response = await axios.post(appleUrl, {
        'receipt-data': ctx.request.body.receipt,
        password,
      })
      const latestReceipt = response.data.latest_receipt
      const latestReceiptInfo = response.data.latest_receipt_info
      // Get latest
      let latestSubscription = 0
      for (const info of latestReceiptInfo) {
        if (+info.expires_date_ms > latestSubscription) {
          latestSubscription = +info.expires_date_ms
        }
      }
      // Check status
      const subscriptionIsActive = new Date().getTime() < latestSubscription
      if (subscriptionIsActive) {
        ctx.state.user.subscriptionStatus = SubscriptionStatus.active
      }
      ctx.state.user.appleReceipt = latestReceipt
      await ctx.state.user.save()
      ctx.status = 200
    } catch (err) {
      report(err)
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
