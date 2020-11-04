import { Controller, Ctx, Flow, Get } from 'koa-ts-controllers'
import { Context } from 'koa'
import { authenticate } from '@/middlewares/authenticate'
import { getOrCreateHero } from '@/models/hero'

@Controller('/hero')
export default class HeroController {
  @Get('/')
  @Flow(authenticate)
  async get(@Ctx() ctx: Context) {
    return await getPoints(ctx)
  }
}

export async function getPoints(ctx: Context) {
  const hero = await getOrCreateHero(ctx.state.user._id)
  return hero.points
}
