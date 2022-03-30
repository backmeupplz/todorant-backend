import { badRequest } from '@hapi/boom'
import { mongoose } from '@typegoose/typegoose'

export const handleMongoErrors = async (ctx, next) => {
  try {
    await next()
  } catch (err) {
    if (
      err instanceof mongoose.Error ||
      err instanceof mongoose.mongo.MongoError
    ) {
      const boomError = badRequest(err.message)
      console.log(boomError)
      throw boomError
    }
  }
}
