// Dependencies
import { Controller, Post } from 'koa-router-ts'
import { Context } from 'koa'
import { authenticate } from '../middlewares/authenticate'
import { SubscriptionStatus } from '../models'
const Verifier = require('google-play-billing-validator')

const googleCredentials = require('../../assets/api-4987639842126744234-562450-c85efe0aadfc.json')

const verifier = new Verifier({
  email: googleCredentials.client_email,
  key: googleCredentials.private_key,
})

@Controller('/google')
export default class {
  @Post('/subscription', authenticate)
  async subscription(ctx: Context) {
    await verifier.verifySub(ctx.request.body)
    ctx.state.user.subscriptionStatus = SubscriptionStatus.active
    ctx.state.user.googleReceipt = ctx.request.body.purchaseToken
    await ctx.state.user.save()
    ctx.status = 200
  }
}
