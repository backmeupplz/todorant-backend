// Dependencies
import { Todo } from '../models'
import { User } from '../models/user'
import { Context } from 'koa'
import { InstanceType } from 'typegoose'

export function isTodoOld(todo: Todo, date: string, ctx: Context) {
  const user = ctx.state.user as InstanceType<User>
  const startTimeOfDay = user.settings.startTimeOfDay
  const day = date.substr(8)
  const monthAndYear = date.substr(0, 7)
  const yesterday = `${parseInt(day) - 1}`
  const now = new Date()
  const todayDate = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    parseInt(startTimeOfDay.substr(0, 2)),
    parseInt(startTimeOfDay.substr(3))
  )

  // Exact date exists or not
  if (todo.date) {
    if (todo.monthAndYear < monthAndYear) {
      return true
    }
    if (
      todo.monthAndYear === monthAndYear &&
      todo.date == yesterday &&
      now >= todayDate
    ) {
      return true
    }
    if (todo.monthAndYear === monthAndYear && todo.date < yesterday) {
      return true
    }
  } else {
    if (todo.monthAndYear <= monthAndYear) {
      return true
    }
  }
  return false
}
