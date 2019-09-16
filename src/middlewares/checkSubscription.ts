// Dependencies
import { User } from '../models/user'
import { Context } from 'koa'
import { errors } from '../helpers/errors'
import { InstanceType } from 'typegoose'
import { report } from '../helpers/report'
import { isUserSubscribed } from '../helpers/isUserSubscribed'

export async function checkSubscription(ctx: Context, next: Function) {
  try {
    const user = ctx.state.user as InstanceType<User>
    if (!isUserSubscribed(user)) {
      return ctx.throw(403, JSON.stringify(errors.subscription))
    }
    next()
  } catch (err) {
    await report(err)
    return ctx.throw(403, JSON.stringify(errors.authentication))
  }
  await next()
}
