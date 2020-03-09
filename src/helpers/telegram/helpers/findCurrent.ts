import { User, Todo, UserModel, TodoModel } from '../../../models'
import { InstanceType } from 'typegoose'
import { getTodos } from '../../../controllers/todo'

export async function findCurrentForUser(
  user: InstanceType<User>
): Promise<InstanceType<Todo> | undefined> {
  // Get date
  const now = new Date()
  const utc = new Date(now.getTime() + now.getTimezoneOffset() * 60000)
  const nowWithOffset = new Date(utc.getTime() + 3600000 * (user.timezone || 0))
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
  ).filter(todo => {
    return todo.date === day && todo.monthAndYear === monthAndYear
  })
  // Return current
  return incompleteTodos.length
    ? await TodoModel.findById(incompleteTodos[0]._id)
    : undefined
}
