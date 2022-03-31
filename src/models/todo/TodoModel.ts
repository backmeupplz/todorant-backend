import { fromSqlToObject, WMDBTables, WMDBTodo } from '@/helpers/wmdb'
import { Todo } from '@/models/todo/Todo'
import { getModelForClass, Ref } from '@typegoose/typegoose'
import { omit } from 'lodash'
import { Document } from 'mongoose'
import { sanitizeDelegation, User } from '../user'

export const TodoModel = getModelForClass(Todo, {
  schemaOptions: { timestamps: true },
})

export async function createWMDBTodo(
  sqlRaw: WMDBTodo,
  user: User,
  pushBackTodos: Todo[],
  usersForSync: Set<Ref<User, string>>,
  savedTodos: Todo[]
) {
  const todoFromSql = fromSqlToObject(sqlRaw, WMDBTables.Todo, user._id) as Todo
  await sanitizeDelegation(todoFromSql, user)
  const query = {
    user: todoFromSql.user,
    $or: [],
  } as {
    user: Ref<User, string>
    $or: unknown[]
    delegator?: Ref<User, string>
  }
  if (todoFromSql.delegator) {
    query.delegator = todoFromSql.delegator
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
    await updateWMDBTodo(sqlRaw, user, pushBackTodos, usersForSync, savedTodos)
    return
  }
  const mongoTodo = await new TodoModel(
    omit(todoFromSql, ['_id', 'createdAt', 'updatedAt'])
  ).save()
  pushBackTodos.push({
    ...todoFromSql,
    ...(mongoTodo as Document & { _doc: any })._doc,
  })
  savedTodos.push(mongoTodo as unknown as Todo)
}

export async function updateWMDBTodo(
  sqlRaw: WMDBTodo,
  user: User,
  pushBackTodos: Todo[],
  usersForSync: Set<Ref<User, string>>,
  savedTodos: Todo[]
) {
  const todoFromSql = fromSqlToObject(sqlRaw, WMDBTables.Todo, user._id) as Todo
  await sanitizeDelegation(todoFromSql, user)
  const query = {
    user: todoFromSql.user,
    $or: [],
  } as {
    user: Ref<User, string>
    $or: unknown[]
    delegator?: Ref<User, string>
  }
  if (todoFromSql.delegator) {
    query.delegator = todoFromSql.delegator
  }
  if (todoFromSql._id) {
    query.$or.push({ _id: todoFromSql._id })
  }
  if (todoFromSql.clientId) {
    query.$or.push({ clientId: todoFromSql.clientId })
  }
  const inMongo = await TodoModel.findOne(query)
  if (!inMongo) {
    await createWMDBTodo(sqlRaw, user, pushBackTodos, usersForSync, savedTodos)
    return
  }
  const incorrectDelegation = await sanitizeDelegation(
    todoFromSql,
    user,
    inMongo
  )
  if (incorrectDelegation) {
    return
  }
  if (todoFromSql.delegator) {
    usersForSync.add(todoFromSql.delegator)
  }
  usersForSync.add(todoFromSql.user)
  Object.assign(
    inMongo,
    omit(todoFromSql, ['_id', 'createdAt', 'updatedAt', 'clientId'])
  )
  await inMongo.save()
  savedTodos.push(inMongo)
}
