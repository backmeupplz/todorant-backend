import { Controller, Post, Get } from 'koa-router-ts'
import { Context } from 'koa'
import { authenticate, getUserFromToken } from '../middlewares/authenticate'
import { Hero, HeroModel, getOrCreateHero } from '../models/hero'

@Controller('/hero')
export default class {
  @Get('/', authenticate)
  async get(ctx: Context) {
    const user = await getUserFromToken(ctx.headers.token)
    const hero = await getOrCreateHero(user)
    ctx.status = 200
    ctx.body = hero
  }
  @Post('/', authenticate)
  async post(ctx: Context) {
    const points = ctx.request.body.points
    const user = await getUserFromToken(ctx.headers.token)
    await HeroModel.findOneAndUpdate(
      { user: user._id },
      { $inc: { points: +points } }
    )
  }
  @Post('/initialize', authenticate)
  async initiinitializelize(ctx: Context) {
    const points = ctx.request.body.points
    const user = await getUserFromToken(ctx.headers.token)
    await HeroModel.findOneAndUpdate({ user: user._id }, { points: points })
    ctx.status = 200
  }
}
