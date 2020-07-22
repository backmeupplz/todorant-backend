import { User, UserModel } from '../models/user'
import { Controller, Post, Get, Delete } from 'koa-router-ts'
import { Context } from 'koa'
import { authenticate } from '../middlewares/authenticate'
import * as randToken from 'rand-token'
import { InstanceType } from 'typegoose'

@Controller('/delegate')
export default class {
  @Post('/generateToken', authenticate)
  async generateToken(ctx: Context) {
    const token = randToken.generate(16)
    ctx.state.user.delegateInviteToken = token
    await ctx.state.user.save()
    ctx.body = token
  }

  @Post('/useToken', authenticate)
  async useToken(ctx: Context) {
    const token = ctx.request.body.token
    const delegator = await UserModel.findOne({ delegateInviteToken: token })
    if (!delegator) {
      return ctx.throw(404)
    }
    if (delegator._id.toString() === ctx.state.user._id.toString()) {
      return ctx.throw(403)
    }
    if (
      !delegator.delegates
        .map((id) => id.toString())
        .includes(ctx.state.user._id.toString())
    ) {
      delegator.delegates.push(ctx.state.user._id)
    }
    await delegator.save()
    ctx.status = 200
  }

  @Get('/', authenticate)
  async getDelegateInfo(ctx: Context) {
    const delegates = (
      await UserModel.findById(ctx.state.user._id).populate('delegates')
    ).delegates.map((d: User) => d.stripped(false, false))
    const delegators = (
      await UserModel.find({ delegates: ctx.state.user._id })
    ).map((d: User) => d.stripped(false, false))
    if (!ctx.state.user.delegateInviteToken) {
      ctx.state.user.delegateInviteToken = randToken.generate(16)
      await ctx.state.user.save()
    }
    const token = ctx.state.user.delegateInviteToken
    ctx.body = {
      delegates,
      delegators,
      token,
    }
  }

  @Delete('/delegate/:id', authenticate)
  async deleteDelegate(ctx: Context) {
    const user = ctx.state.user as InstanceType<User>
    user.delegates = user.delegates.filter(
      (id) => id.toString() !== ctx.params.id
    )
    await user.save()
    ctx.status = 200
  }

  @Delete('/delegator/:id', authenticate)
  async deleteDelegator(ctx: Context) {
    const user = ctx.state.user as InstanceType<User>
    const delegators = await UserModel.find({ delegates: user._id })
    for (const delegator of delegators) {
      delegator.delegates = delegator.delegates.filter(
        (id) => id.toString() !== user._id.toString()
      )
      await delegator.save()
    }
    ctx.status = 200
  }
}
