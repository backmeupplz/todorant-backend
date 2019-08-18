// Dependencies
import { Controller, Get } from 'koa-router-ts'
import { Context } from 'koa'
import Markdown = require('markdown')
import { readFileSync } from 'fs'

@Controller('/')
export default class {
  @Get('/')
  async docs(ctx: Context) {
    try {
      const md = readFileSync(`${__dirname}/../../docs/README.md`, 'UTF-8')
      ctx.body = Markdown.markdown.toHTML(md, 'Maruku')
    } catch (err) {
      ctx.status = 500
    }
  }
}
