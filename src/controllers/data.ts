import { Context } from 'koa'
import { Controller, Ctx, Delete, Flow, Get, Post } from 'koa-ts-controllers'
import { DocumentType } from '@typegoose/typegoose'
import { TagModel } from '@/models/tag'
import { TodoModel } from '@/models/todo'
import { User, UserModel } from '@/models/user'
import { _d } from '@/helpers/encryption'
import { admins } from '@/helpers/telegram/admins'
import { authenticate } from '@/middlewares/authenticate'
import { bot, report } from '@/helpers/report'
import { getTodos } from '@/controllers/todo'
import { path } from 'temp'
import { requestSync } from '@/sockets'
import { unlinkSync, writeFileSync } from 'fs'

@Controller('/data')
export default class DataController {
  @Post('/')
  @Flow(authenticate)
  async postData(@Ctx() ctx: Context) {
    const tempPath = path({ suffix: '.json' })
    writeFileSync(tempPath, JSON.stringify(ctx.request.body.data, undefined, 2))
    try {
      await bot.telegram.sendMessage(
        admins[0],
        `${ctx.state.user._id} ${ctx.state.user.name}`
      )
      await bot.telegram.sendDocument(admins[0], { source: tempPath })
    } catch (err) {
      report(err)
      throw err
      // Do nothing
    } finally {
      unlinkSync(tempPath)
    }
    ctx.status = 200
  }

  @Get('/')
  @Flow(authenticate)
  async get(@Ctx() ctx: Context) {
    const password = ctx.headers.password
    const incompleteTodos = await getTodos(ctx.state.user, false, '')
    const completeTodos = await getTodos(ctx.state.user, true, '')
    const allTodos = [...completeTodos, ...incompleteTodos]
      .filter((todo) => !todo.deleted)
      .map((todo) => {
        if (todo.encrypted && password) {
          todo.text = _d(todo.text, password)
        }
        return todo
      })
    let string = ''
    for (const todo of allTodos) {
      const dateCreated = `${new Date(todo.createdAt).toISOString()}`.substring(
        0,
        10
      )
      let dateDue = `${todo.monthAndYear}`
      if (todo.date) {
        dateDue += `-${todo.date}`
      }
      if (todo.completed) {
        string += `x ${dateDue} ${dateCreated} ${todo.text} due:${dateDue}\n`
      } else {
        string += `${todo.text} due:${dateDue}\n`
      }
    }

    ctx.status = 200
    return string
  }

  @Delete('/account')
  @Flow(authenticate)
  async deleteUser(@Ctx() ctx: Context) {
    // Find user
    const user = ctx.state.user as DocumentType<User>
    // Find all todos
    const todos = await TodoModel.find({
      user: user.id,
    })
    const delegatedTodos = await TodoModel.find({
      delegator: user.id,
      delegateAccepted: { $ne: true },
    })
    // Find delegates
    const delegates = await UserModel.find({ delegates: user.delegates })
    // Find delegators
    const delegators = await UserModel.find({
      delegates: user.id,
    })
    // Find tags
    const tags = await TagModel.find({ user: user.id })
    try {
      // Delete todos
      for (const todo of todos) {
        todo.deleted = true
        todo.markModified('deleted')
        await todo.save()
      }
      // Delete delegated todos
      for (const todo of delegatedTodos) {
        todo.deleted = true
        todo.markModified('deleted')
        await todo.save()
      }
      // Delete tags
      for (const tag of tags) {
        tag.deleted = true
        tag.markModified('deleted')
        await tag.save()
      }
      // Delete delegates
      await UserModel.updateOne(
        { _id: user.id },
        {
          $pull: {
            delegates: { $in: [...user.delegates] },
          },
          delegatesUpdatedAt: new Date(),
        }
      )
      // Delete delegators
      await UserModel.updateMany(
        { delegates: user.id },
        {
          $pull: {
            delegates: { $in: user.id },
          },
          delegatesUpdatedAt: new Date(),
        }
      )
      requestSync(user.id)
      for (const delegate of delegates) {
        requestSync(delegate.toString())
      }
      for (const delegator of delegators) {
        requestSync(delegator._id)
      }
      // Delete user
      await UserModel.deleteOne({ _id: user.id })
    } catch (err) {
      report(err)
      console.error(err)
    }
  }
}
