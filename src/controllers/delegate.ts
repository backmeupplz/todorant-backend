import { errors } from '@/helpers/errors'
import { TodoModel, getTitle } from '@/models/todo'
import { User, UserModel } from '@/models/user'
import { Controller, Ctx, Flow, Get, Post, Delete } from 'koa-ts-controllers'
import { Context } from 'koa'
import { authenticate } from '@/middlewares/authenticate'
import * as randToken from 'rand-token'
import { DocumentType } from '@typegoose/typegoose'
import { fixOrder } from '@/helpers/fixOrder'
import { requestSync } from '@/sockets/index'
import { updateTodos } from '@/helpers/googleCalendar'

@Controller('/delegate')
export default class DelegateController {
  @Post('/generateToken')
  @Flow(authenticate)
  async generateToken(@Ctx() ctx: Context) {
    const token = randToken.generate(16)
    ctx.state.user.delegateInviteToken = token
    await ctx.state.user.save()
    return token
  }

  @Post('/useToken')
  @Flow(authenticate)
  async useToken(@Ctx() ctx: Context) {
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

  @Get('/')
  @Flow(authenticate)
  async getDelegateInfo(@Ctx() ctx: Context) {
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
    return {
      delegates,
      delegators,
      token,
    }
  }

  @Delete('/delegate/:id')
  @Flow(authenticate)
  async deleteDelegate(@Ctx() ctx: Context) {
    const user = ctx.state.user as DocumentType<User>
    user.delegates = user.delegates.filter(
      (id) => id.toString() !== ctx.params.id
    )
    await user.save()
    ctx.status = 200
  }

  @Delete('/delegator/:id')
  @Flow(authenticate)
  async deleteDelegator(@Ctx() ctx: Context) {
    const user = ctx.state.user as DocumentType<User>
    const delegators = await UserModel.find({ delegates: user._id })
    for (const delegator of delegators) {
      delegator.delegates = delegator.delegates.filter(
        (id) => id.toString() !== user._id.toString()
      )
      await delegator.save()
    }
    ctx.status = 200
  }

  @Get('/unaccepted')
  @Flow(authenticate)
  async getUnaccepted(@Ctx() ctx: Context) {
    const todos = await TodoModel.find({
      deleted: false,
      user: ctx.state.user._id,
      delegator: { $exists: true },
      $or: [{ delegateAccepted: false }, { delegateAccepted: null }],
    })
      .populate('user')
      .populate('delegator')
    return todos.map((t) => t.stripped())
  }

  @Post('/accept/:id')
  @Flow(authenticate)
  async acceptTodo(@Ctx() ctx: Context) {
    // Parameters
    const id = ctx.params.id
    // Find todo
    const todo = await TodoModel.findById(id)
    // Check ownership
    if (!todo || todo.user.toString() !== ctx.state.user._id.toString()) {
      return ctx.throw(404, errors.noTodo)
    }
    // Edit and save
    todo.delegateAccepted = true
    await todo.save()
    // Fix order
    await fixOrder(ctx.state.user, [getTitle(todo)])
    // Respond
    ctx.status = 200
    // Trigger sync
    requestSync(ctx.state.user._id)
    // Update calendar
    updateTodos(
      [todo],
      ctx.state.user.settings.googleCalendarCredentials,
      ctx.headers.password
    )
  }

  @Get('/todos')
  @Flow(authenticate)
  async getDelegatedTodos(@Ctx() ctx: Context) {
    const todos = await TodoModel.find({
      deleted: false,
      user: { $exists: true },
      delegator: ctx.state.user._id,
    })
      .populate('user')
      .populate('delegator')
    return todos.map((t) => t.stripped())
  }
}
