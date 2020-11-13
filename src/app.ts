// Setup typegoose
import { setGlobalOptions, Severity } from '@typegoose/typegoose'
setGlobalOptions({
  options: {
    allowMixed: Severity.ALLOW,
  },
})
// The rest of dependencies
import 'reflect-metadata'
import * as Koa from 'koa'
import * as bodyParser from 'koa-bodyparser'
import * as Router from 'koa-router'
import * as cors from '@koa/cors'
import '@/helpers/bouncersMessage'
import '@/helpers/powerUsersMessage'
import '@/helpers/checkAppleSubscribers'
import '@/helpers/checkGoogleSubscribers'
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
    app.use(bodyParser())
    app.use(router.routes())
    app.use(router.allowedMethods())
  } catch (err) {
    console.log('Koa app starting error: ', err)
  }
})()
