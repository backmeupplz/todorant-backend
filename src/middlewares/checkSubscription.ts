import { User } from '@/models/user'
import { Context } from 'koa'
import { errors } from '@/helpers/errors'
import { DocumentType } from '@typegoose/typegoose'
import { report } from '@/helpers/report'
import { isUserSubscribed } from '@/helpers/isUserSubscribed'

export async function checkSubscription(ctx: Context, next: Function) {
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
