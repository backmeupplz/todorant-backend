import { Controller, Get } from 'koa-router-ts'
import { Context } from 'koa'
import showdown = require('showdown')
import { readFileSync } from 'fs'

// showdown.setOption('completeHTMLDocument', true)
showdown.setFlavor('github')

@Controller('/')
export default class {
  @Get('/')
  docs(ctx: Context) {
    try {
      const converter = new showdown.Converter()
      const md = readFileSync(`${__dirname}/../../docs/README.md`, 'UTF-8')
      const css = readFileSync(`${__dirname}/../../docs/style.css`, 'UTF-8')
      ctx.body = `<style>${css}</style><div class="markdown-body">${converter.makeHtml(
        md
      )}</div>`
    } catch (err) {
      ctx.status = 500
    }
  }
}
