import * as randToken from 'rand-token'
import { Context } from 'koa'
import { Controller, Ctx, Delete, Flow, Get, Post } from 'koa-ts-controllers'
import { DocumentType } from '@typegoose/typegoose'
import { TodoModel, getTitle } from '@/models/todo'
import { User, UserModel } from '@/models/user'
import { authenticate } from '@/middlewares/authenticate'
import { errors } from '@/helpers/errors'
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
    const user = ctx.state.user as DocumentType<User>
    const token = ctx.request.body.token
    const delegator = await UserModel.findOne({ delegateInviteToken: token })
    if (!delegator) {
      return ctx.throw(404)
    }
    if (delegator._id.toString() === user._id.toString()) {
      return ctx.throw(403)
    }
    if (
      !delegator.delegates
        .map((id) => id.toString())
        .includes(user._id.toString())
    ) {
      delegator.delegates.push(user._id)
      delegator.delegatesUpdatedAt = new Date()
    }
    await delegator.save()
    await UserModel.updateOne(
      { _id: user._id },
      { delegatesUpdatedAt: new Date() }
    )
    requestSync(user._id)
    requestSync(delegator._id)
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
    user.delegatesUpdatedAt = new Date()
    await user.save()
    await UserModel.updateOne(
      { _id: ctx.params.id },
      { delegatesUpdatedAt: new Date() }
    )
    requestSync(user._id)
    requestSync(ctx.params.id)
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
      delegator.delegatesUpdatedAt = new Date()
      await delegator.save()
      requestSync(delegator._id)
    }
    await UserModel.updateOne(
      { _id: user._id },
      { delegatesUpdatedAt: new Date() }
    )
    requestSync(user._id)
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
