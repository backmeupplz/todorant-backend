import { Context } from 'koa'
import { Controller, Ctx, Flow, Get, Post } from 'koa-ts-controllers'
import { Todo } from '@/models/todo'
import { TodoModel, getTitle } from '@/models/todo'
import { UserModel } from '@/models/user'
import { authenticate } from '@/middlewares/authenticate'
import { fixOrder } from '@/helpers/fixOrder'
import {
  getGoogleCalendarApi,
  getGoogleCalendarOAuthURL,
  getGoogleCalendarToken,
  getGoogleEvents,
  getTodorantCalendar,
} from '@/helpers/googleCalendar'
import { requestSync } from '@/sockets/index'
import { startWatch } from '@/helpers/googleCalendarChannel'

@Controller('/google')
export default class GoogleController {
  @Get('/calendarAuthenticationURL')
  @Flow(authenticate)
  async calendarAuthenticationURL(@Ctx() ctx: Context) {
    return await getGoogleCalendarOAuthURL(!!ctx.query.web)
  }

  @Post('/calendarAuthorize')
  @Flow(authenticate)
  async calendarAuthorize(@Ctx() ctx: Context) {
    const code = ctx.request.body.code
    if (!code) {
      return ctx.throw(403)
    }
    const credentials = await getGoogleCalendarToken(
      code,
      !!ctx.request.body.web
    )
    const userId = ctx.state.user._id
    startWatch(credentials, userId)
    return credentials
  }

  @Post('/notifications')
  async post(@Ctx() ctx: Context) {
    try {
      const id = ctx.request.header['x-goog-channel-id']
      const user = await UserModel.findOne({
        _id: id,
      })
      const credentials = user.settings.googleCalendarCredentials
      const api = getGoogleCalendarApi(credentials)
      const todorantCalendar = await getTodorantCalendar(api)
      const events = await getGoogleEvents(api, todorantCalendar)
      const deletedEvents = events.filter((event) => {
        return event.status === 'cancelled'
      })
      const timedEvents = events.filter((event) => {
        if (!event.start) {
          return false
        }
        return event.start.dateTime
      })
      deletedEvents.forEach(async (event) => {
        await TodoModel.findOneAndUpdate(
          {
            _id: event.id,
            time: { $ne: null },
          },
          { completed: true }
        )
      })
      const changedTodos = [] as Todo[]
      timedEvents.forEach(async (event) => {
        const eventDate = event.start.dateTime
        const todo = await TodoModel.findOne({
          _id: event.id,
        })
        if (!todo) {
          return
        }
        const monthAndYearInEvent = eventDate.substr(0, 7)
        const timeInEvent = eventDate.substr(11, 5)
        const dateInEvent = eventDate.substr(8, 2)
        let needsSaving = false
        if (timeInEvent !== todo.time) {
          todo.time = timeInEvent
          needsSaving = true
        }
        if (dateInEvent !== todo.date) {
          todo.date = dateInEvent
          needsSaving = true
        }
        if (monthAndYearInEvent !== todo.monthAndYear) {
          todo.monthAndYear = monthAndYearInEvent
          needsSaving = true
        }
        if (needsSaving) {
          todo.save()
          changedTodos.push(todo)
        }
      })
      // Fix order
      await fixOrder(
        user,
        changedTodos.map((t) => getTitle(t))
      )
      // Trigger sync
      requestSync(user._id)
      ctx.status = 200
    } catch (err) {
      ctx.status = 500
    }
  }
}
