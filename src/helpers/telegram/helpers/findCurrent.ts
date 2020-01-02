import { User, Todo, UserModel } from '../../../models'
import { InstanceType } from 'typegoose'

export async function findCurrentForUser(
  user: InstanceType<User>
): Promise<InstanceType<Todo>> {
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
  const todos = (
    await UserModel.findById(user.id).populate('todos')
  ).todos.filter((todo: Todo) => {
    return +todo.date === +day && todo.monthAndYear === monthAndYear
  }) as InstanceType<Todo>[]
  const incompleteTodos = todos
    .filter(t => !t.completed)
    .sort((a, b) => {
      if (a.frog && b.frog) {
        return 0
      }
      if (a.frog) {
        return -1
      }
      if (b.frog) {
        return 1
      }
      if (a.skipped && b.skipped) {
        return 0
      }
      if (a.skipped) {
        return 1
      }
      if (b.skipped) {
        return -1
      }
      return 0
    })
  // Return current
  return (incompleteTodos.length ? incompleteTodos[0] : undefined) as
    | InstanceType<Todo>
    | undefined
}
