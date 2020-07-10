import { User, UserModel } from '../models/user'
import { Controller, Post, Delete, Get } from 'koa-router-ts'
import { Context } from 'koa'
import { authenticate } from '../middlewares/authenticate'
import * as randToken from 'rand-token'

@Controller('/delegate')
export default class {
  @Post('/generateToken', authenticate)
  async generateToken(ctx: Context) {
    const token = randToken.generate(16)
    ctx.state.user.delegateInviteToken = token
    await ctx.state.user.save()
    ctx.body = token
  }

  @Delete('/deleteToken', authenticate)
  async deleteToken(ctx: Context) {
    ctx.state.user.delegateInviteToken = undefined
    await ctx.state.user.save()
    ctx.status = 200
  }

  @Post('/useToken', authenticate)
  async useToken(ctx: Context) {
    const token = ctx.request.body.token
    const delegator = await UserModel.findOne({ delegateInviteToken: token })
    if (!delegator) {
      return ctx.throw(404)
    }
    if (
      !delegator.delegates
        .map((id) => id.toString())
        .includes(ctx.state.user._id.toString())
    ) {
      delegator.delegates.push(ctx.state.user._id)
    }
    ctx.status = 200
  }

  @Get('/delegates', authenticate)
  async getDelegates(ctx: Context) {
    ctx.body = (
      await UserModel.findById(ctx.state.user._id).populate('delegates')
    ).delegates.map((d: User) => d.stripped(false, false))
  }
}
