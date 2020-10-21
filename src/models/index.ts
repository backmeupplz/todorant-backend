import * as mongoose from 'mongoose'
import { setGlobalOptions, Severity } from '@typegoose/typegoose'

mongoose.connect(process.env.MONGO, {
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
