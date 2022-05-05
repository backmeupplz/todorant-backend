import { Context } from 'koa'
import { Controller, Ctx, Get } from 'koa-ts-controllers'
import showdown = require('showdown')
import { readFileSync } from 'fs'

showdown.setFlavor('github')

@Controller('/')
export default class PublicController {
  @Get('/')
  docs(@Ctx() ctx: Context) {
    try {
      const converter = new showdown.Converter()
      const md = readFileSync(`${__dirname}/../../docs/README.md`, 'utf8')
      const css = readFileSync(`${__dirname}/../../docs/style.css`)
      return `<style>${css}</style><div class="markdown-body">${converter.makeHtml(
        md
      )}</div>`
    } catch (err) {
      ctx.throw(500)
    }
  }
}
