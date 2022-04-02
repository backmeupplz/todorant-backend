import { Boom, badRequest } from '@hapi/boom'
import { mongoose } from '@typegoose/typegoose'

export const handleMongoErrors = async (ctx, next) => {
  try {
    await next()
  } catch (err) {
    if (
      err instanceof mongoose.Error ||
      err instanceof mongoose.mongo.MongoError
    ) {
      throw badRequest(err.message)
    }
    throw new Boom(err.message, {
      statusCode: err.status || err?.output?.statusCode || 500,
    })
  }
}
