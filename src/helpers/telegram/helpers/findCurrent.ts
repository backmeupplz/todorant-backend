import { Todo, TodoModel } from '@/models/todo'
import { User, UserModel } from '@/models/user'
import { DocumentType } from '@typegoose/typegoose'
import { getTodos } from '@/controllers/todo'
import moment = require('moment')

export async function findCurrentForUser(
  user: DocumentType<User>
): Promise<{ todo: DocumentType<Todo> | undefined; count: number }> {
  // Get date
  const now = new Date()
  const utc = new Date(now.getTime() + now.getTimezoneOffset() * 60000)
  const nowWithOffset = moment(
    new Date(utc.getTime() + 3600000 * +user.timezone)
  ).toDate()
  const month = nowWithOffset.getMonth() + 1
  const monthAndYear = `${nowWithOffset.getFullYear()}-${
    month > 9 ? month : `0${month}`
  }`
  const day =
    nowWithOffset.getDate() < 10
      ? `0${nowWithOffset.getDate()}`
      : nowWithOffset.getDate()
  // Find todos
  const incompleteTodos = (
    await getTodos(await UserModel.findById(user.id), false, '')
  ).filter((todo) => {
    return `${todo.date}` === `${day}` && todo.monthAndYear === monthAndYear
  })
  // Return current
  return incompleteTodos.length
    ? {
        todo: await TodoModel.findById(incompleteTodos[0]._id),
        count: incompleteTodos.length,
      }
    : { todo: undefined, count: 0 }
}
