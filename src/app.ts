// Get environment variables
import * as dotenv from 'dotenv'
dotenv.config({ path: `${__dirname}/../.env` })
// Dependencies
import 'reflect-metadata'
import * as Koa from 'koa'
import bodyParser from 'koa-bodyparser-ts'
import { loadControllers } from 'koa-router-ts'
import * as cors from '@koa/cors'
import { bot } from './helpers/telegram'
import * as GracefulShutdown from 'http-graceful-shutdown'
import './helpers/bouncersMessage'
import './helpers/checkAppleSubscribers'
import './sockets'
const logger = require('koa-logger')

const app = new Koa()
const router = loadControllers(`${__dirname}/controllers`, { recurse: true })

// Run app
app.use(logger())
app.use(cors({ origin: '*' }))
app.use(bodyParser())
app.use(router.routes())
app.use(router.allowedMethods())
app.listen(1337)

console.log('Koa application is up and running on port 1337')

GracefulShutdown(app, {
  onShutdown: async (signal) => {
    bot.stop()
  },
})
