// Dependencies
import { Controller, Get } from 'koa-router-ts'
import { Context } from 'koa'
import { readFileSync } from 'fs'

@Controller('/md')
export default class {
  @Get('/')
  docs(ctx: Context) {
    try {
      ctx.body = readFileSync(`${__dirname}/../../docs/README.md`, 'UTF-8')
    } catch (err) {
      ctx.status = 500
    }
  }
}
