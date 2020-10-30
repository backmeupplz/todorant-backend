import { Controller, Ctx, Flow, Get, Post } from 'koa-ts-controllers'

import { Context } from 'koa'
import { readFileSync } from 'fs'

@Controller('/md')
export default class DocsController {
  @Get('/')
  docs(@Ctx() ctx: Context) {
    try {
      return readFileSync(`${__dirname}/../../docs/README.md`)
    } catch (err) {
      ctx.throw(500)
    }
  }
}
