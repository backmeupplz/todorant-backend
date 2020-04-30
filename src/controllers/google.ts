// Dependencies
import { Controller, Post, Get } from 'koa-router-ts'
import { Context } from 'koa'
import { authenticate } from '../middlewares/authenticate'
import { SubscriptionStatus } from '../models'
import {
  getGoogleCalendarOAuthURL,
  getGoogleCalendarToken,
} from '../helpers/googleCalendar'
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

  @Get('/calendarAuthenticationURL', authenticate)
  async calendarAuthenticationURL(ctx: Context) {
    ctx.body = await getGoogleCalendarOAuthURL()
  }

  @Post('/calendarAuthorize', authenticate)
  async calendarAuthorize(ctx: Context) {
    const code = ctx.request.body.code
    if (!code) {
      return ctx.throw(403)
    }
    ctx.body = await getGoogleCalendarToken(code)
  }
}
