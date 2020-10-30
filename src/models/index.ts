import * as mongoose from 'mongoose'
import { setGlobalOptions, Severity } from '@typegoose/typegoose'

export function runMongo(mongoUrl = process.env.MONGO) {
  mongoose.connect(mongoUrl, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })

  mongoose.set('useCreateIndex', true)
  mongoose.set('useFindAndModify', false)

  setGlobalOptions({
    options: {
      allowMixed: Severity.ALLOW,
    },
  })
}
