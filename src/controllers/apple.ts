// Dependencies
import { Controller, Post } from 'koa-router-ts'
import { Context } from 'koa'
import { authenticate } from '../middlewares/authenticate'
import axios from 'axios'
import { SubscriptionStatus } from '../models'

@Controller('/apple')
export default class {
  @Post('/')
  docs(ctx: Context) {
    if (ctx.request.body.error) {
      ctx.redirect(`https://todorant.com?appleError=${ctx.request.body.error}`)
    }
    ctx.redirect(
      `https://todorant.com?apple=${JSON.stringify(ctx.request.body)}`
    )
  }

  @Post('/subscription', authenticate)
  async subscription(ctx: Context) {
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
      if (info.expires_date_ms > latestSubscription) {
        latestSubscription = info.expires_date_ms
      }
    }
    // Check status
    const subscriptionIsActive = new Date().getTime() < latestSubscription
    if (subscriptionIsActive) {
      ctx.state.user.subscriptionStatus = SubscriptionStatus.active
    }
    console.log(subscriptionIsActive)
    ctx.state.user.appleReceipt = latestReceipt
    await ctx.state.user.save()
    ctx.status = 200
  }
}
