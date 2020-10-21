import { Controller, Get } from 'koa-router-ts'
import { Context } from 'koa'
import showdown = require('showdown')
import { readFileSync } from 'fs'

showdown.setFlavor('github')

@Controller('/')
export default class {
  @Get('/')
  docs(ctx: Context) {
    try {
      const converter = new showdown.Converter()
      const md = readFileSync(`${__dirname}/../../docs/README.md`)
      const css = readFileSync(`${__dirname}/../../docs/style.css`)
      ctx.body = `<style>${css}</style><div class="markdown-body">${converter.makeHtml(
        md
      )}</div>`
    } catch (err) {
      ctx.status = 500
    }
  }
}
