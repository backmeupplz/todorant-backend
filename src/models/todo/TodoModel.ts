import { fromSqlToObject, WMDBTables, WMDBTodo } from '@/helpers/wmdb'
import { Todo } from '@/models/todo/Todo'
import { getModelForClass } from '@typegoose/typegoose'
import { omit } from 'lodash'
import { Document } from 'mongoose'
import { sanitizeDelegation, User } from '../user'

export const TodoModel = getModelForClass(Todo, {
  schemaOptions: { timestamps: true },
})

export async function createWMDBTodo(
  sqlRaw: WMDBTodo,
  user: User,
  pushBackTodos: Todo[]
) {
  const todoFromSql = fromSqlToObject(sqlRaw, WMDBTables.Todo, user._id) as Todo
  const query = {
    user: user._id,
    $or: [],
  }
  if (todoFromSql._id) {
    query.$or.push({ _id: todoFromSql._id })
  }
  if (todoFromSql.clientId) {
    query.$or.push({ clientId: todoFromSql.clientId })
  }
  // If no client id nor server id
  if (!query.$or.length) {
    throw new Error(
      'Server id or client id of todo was not specified. Please, try to re-login into your account.'
    )
  }
  const todoExist = !!(await TodoModel.findOne(query))
  if (todoExist) {
    throw new Error(
      'Created todo was found in the database. Please, try to re-login into your account.'
    )
  }
  await sanitizeDelegation(todoFromSql, user)
  const mongoTodo = await new TodoModel(
    omit(todoFromSql, ['_id', 'createdAt', 'updatedAt'])
  ).save()
  pushBackTodos.push({
    ...todoFromSql,
    ...(mongoTodo as Document & { _doc: any })._doc,
  })
}
