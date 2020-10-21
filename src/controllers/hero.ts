import { Controller, Get } from 'koa-router-ts'
import { Context } from 'koa'
import { authenticate } from '@middlewares/authenticate'
import { getOrCreateHero } from '@models/hero'

@Controller('/hero')
export default class {
  @Get('/', authenticate)
  async get(ctx: Context) {
    ctx.body = await getPoints(ctx)
  }
}

export async function getPoints(ctx: Context) {
  const hero = await getOrCreateHero(ctx.state.user._id)
  return hero.points
}
