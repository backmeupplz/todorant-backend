// Setup typegoose
import { setGlobalOptions, Severity } from '@typegoose/typegoose'
setGlobalOptions({
  options: {
    allowMixed: Severity.ALLOW,
  },
})
// Get environment variables
import * as dotenv from 'dotenv'
dotenv.config({ path: `${process.cwd()}/.env` })
// The rest of dependencies
import 'reflect-metadata'
import * as Koa from 'koa'
import * as bodyParser from 'koa-bodyparser'
import * as Router from 'koa-router'
import * as cors from '@koa/cors'
import '@/helpers/bouncersMessage'
import '@/helpers/powerUsersMessage'
import '@/helpers/threeWeekUserMessage'
import '@/helpers/checkSubscribers'
import '@/helpers/checkTrials'
import '@/helpers/googleCalendarChannel'
import '@/sockets'
import { bootstrapControllers } from 'koa-ts-controllers'
import * as logger from 'koa-logger'

export const app = new Koa()
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
    app.use(bodyParser({ jsonLimit: '100mb' }))
    app.use(router.routes())
    app.use(router.allowedMethods())
  } catch (err) {
    console.log('Koa app starting error: ', err)
  }
})()
