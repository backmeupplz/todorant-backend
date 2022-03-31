import { Context } from 'koa'
import { DocumentType } from '@typegoose/typegoose'
import { User } from '@/models/user/User'
import { errors } from '@/helpers/errors'
import { isUserSubscribed } from '@/helpers/isUserSubscribed'
import { report } from '@/helpers/report'

export async function checkSubscription(
  ctx: Context,
  next: (...unknown) => Promise<unknown>
) {
  try {
    const user = ctx.state.user as DocumentType<User>
    if (!isUserSubscribed(user)) {
      return ctx.throw(403, errors.subscription)
    }
    await next()
  } catch (err) {
    await report(err)
    return ctx.throw(403, errors.authentication)
  }
}
