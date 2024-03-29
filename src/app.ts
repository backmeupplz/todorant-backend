// Setup typegoose
import { Severity, setGlobalOptions } from '@typegoose/typegoose'
setGlobalOptions({
  options: {
    allowMixed: Severity.ALLOW,
  },
})
// Get environment variables
import * as dotenv from 'dotenv'
dotenv.config({ path: `${process.cwd()}/.env` })
// The rest of dependencies
import '@/helpers/googleCalendarChannel'
import '@/sockets'
import 'reflect-metadata'
import * as Koa from 'koa'
import * as serve from 'koa-static'
import * as mount from 'koa-mount'
import * as Router from 'koa-router'
import * as bodyParser from 'koa-bodyparser'
import * as cors from '@koa/cors'
import * as logger from 'koa-logger'
import { bootstrapControllers } from 'koa-ts-controllers'
import { handleMongoErrors } from '@/middlewares/handleMongoErrors'

export const app = new Koa()
;(async () => {
  try {
    const router = new Router()

    await bootstrapControllers(app, {
      router,
      basePath: '/',
      controllers: [__dirname + '/controllers/*'],
      disableVersioning: true,
      flow: [logger(), handleMongoErrors],
    })

    // Run app
    app.use(cors({ origin: '*' }))
    app.use(bodyParser({ jsonLimit: '100mb' }))
    app.use(router.routes())
    app.use(router.allowedMethods())
    app.use(mount('/docs', serve('./docs/site')))
  } catch (err) {
    console.log('Koa app starting error: ', err)
  }
})()
