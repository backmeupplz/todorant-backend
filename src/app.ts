// Setup @/ aliases for modules
import 'module-alias/register'
// Get environment variables
import * as dotenv from 'dotenv'
dotenv.config({ path: `${__dirname}/../.env` })
// Setup typegoose
import { setGlobalOptions, Severity } from '@typegoose/typegoose'
setGlobalOptions({
  options: {
    allowMixed: Severity.ALLOW,
  },
})
// Get the rest of dependencies
import 'reflect-metadata'
import * as Koa from 'koa'
import * as bodyParser from 'koa-bodyparser'
import * as Router from 'koa-router'
import * as cors from '@koa/cors'
import { bot } from '@/helpers/telegram'
import * as GracefulShutdown from 'http-graceful-shutdown'
import '@/helpers/bouncersMessage'
import '@/helpers/powerUsersMessage'
import '@/helpers/checkAppleSubscribers'
import '@/helpers/checkGoogleSubscribers'
import '@/helpers/googleCalendarChannel'
import '@/sockets'
import { runMongo } from '@/models/index'
import { bootstrapControllers } from 'koa-ts-controllers'
import * as logger from 'koa-logger'

if (process.env.TESTING !== 'true') {
  runMongo()
}

const app = new Koa()

;(async () => {
  try {
    const router = new Router()

    await bootstrapControllers(app, {
      router,
      basePath: '/',
      controllers: [__dirname + '/controllers/*'],
      disableVersioning: true,
    })

    // Run app
    app.use(logger())
    app.use(cors({ origin: '*' }))
    app.use(bodyParser())
    app.use(router.routes())
    app.use(router.allowedMethods())
    console.log('Koa application is up and running on port 1337')
  } catch (err) {
    console.log('Koa app starting error: ', err)
  }
})()

const server = app.listen(1337)

export default server

GracefulShutdown(app, {
  onShutdown: async () => {
    bot.stop()
  },
})
