import { UserModel, User } from '@/models/user'
import { Context } from 'koa'
import { verify } from '@/helpers/jwt'
import { errors } from '@/helpers/errors'
import { DocumentType } from '@typegoose/typegoose'
import { report } from '@/helpers/report'

interface mockCtx {
  headers: { token: string }
  state: any
  throw: (statusCode: number, errorMessage: string) => void
}

export async function authenticate(ctx: Context | mockCtx, next: Function) {
  try {
    const token = ctx.headers.token
    if (!token) {
      return ctx.throw(403, errors.noTokenProvided)
    }
    const user =
      process.env.TESTING === 'true'
        ? testingUserMock(token)
        : await getUserFromToken(token)
    if (!user) {
      return ctx.throw(403, errors.noUser)
    }
    ctx.state.user = user
  } catch (err) {
    await report(err)
    return ctx.throw(403, errors.authentication)
  }
  await next()
}

export async function getUserFromToken(token: string) {
  const payload = (await verify(token)) as any
  let user: DocumentType<User> | undefined
  if (payload.email) {
    user = await UserModel.findOne({ email: payload.email })
  } else if (payload.facebookId) {
    user = await UserModel.findOne({ facebookId: `${payload.facebookId}` })
  } else if (payload.telegramId) {
    user = await UserModel.findOne({ telegramId: `${payload.telegramId}` })
  } else if (payload.vkId) {
    user = await UserModel.findOne({ vkId: `${payload.vkId}` })
  } else if (payload.appleSubId) {
    user = await UserModel.findOne({ appleSubId: `${payload.appleSubId}` })
  } else if (payload.anonymousToken) {
    user = await UserModel.findOne({
      anonymousToken: `${payload.anonymousToken}`,
    })
  }
  return user
}

function testingUserMock(token) {
  if (token === '123') {
    return {
      name: 'Alexander Brennenburg',
      email: 'alexanderrennenburg@gmail.com',
      token: '123',
    }
  }
}
