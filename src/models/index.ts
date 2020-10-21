import * as mongoose from 'mongoose'

mongoose.connect(process.env.MONGO, { useNewUrlParser: true })

mongoose.set('useCreateIndex', true)
mongoose.set('useFindAndModify', false)
