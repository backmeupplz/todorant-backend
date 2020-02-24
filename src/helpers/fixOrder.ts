import { Todo, TodoModel, getTitle } from '../models/todo'
import { User } from '../models/user'
import { InstanceType } from 'typegoose'

export async function fixOrder(
  user: InstanceType<User>,
  titlesInvolved: string[],
  addTodosOnTop = [] as Todo[],
  addTodosToBottom = [] as Todo[]
) {
  const allTodos = await TodoModel.find({ user: user._id, deleted: false })
  const completedTodos = allTodos.filter(t => t.completed)
  const uncompletedTodos = allTodos.filter(t => !t.completed)
  const completedTodosMap = completedTodos.reduce(mapTodos, {})
  const uncompletedTodosMap = uncompletedTodos.reduce(mapTodos, {})
  const addTodosOnTopIds = addTodosOnTop
    ? addTodosOnTop.map(t => t._id.toString())
    : []
  const addTodosToBottomIds = addTodosToBottom
    ? addTodosToBottom.map(t => t._id.toString())
    : []
  const todosToSave = [] as InstanceType<Todo>[]
  for (const titleInvolved of titlesInvolved) {
    // Go over completed
    const orderedCompleted = (completedTodosMap[titleInvolved] || []).sort(
      sortTodos(addTodosOnTopIds, addTodosToBottomIds)
    )
    orderedCompleted.forEach((todo, i) => {
      if (todo.order !== i) {
        todo.order = i
        todosToSave.push(todo)
      }
    })
    // Go over uncompleted
    const orderedUncompleted = (uncompletedTodosMap[titleInvolved] || []).sort(
      sortTodos(addTodosOnTopIds, addTodosToBottomIds)
    )
    orderedUncompleted.forEach((todo, i) => {
      if (todo.order !== i) {
        todo.order = i
        todosToSave.push(todo)
      }
    })
  }
  // Save todos
  await TodoModel.create(todosToSave)
}

function mapTodos(
  prev: { [index: string]: InstanceType<Todo>[] },
  cur: InstanceType<Todo>
) {
  if (prev[getTitle(cur)]) {
    prev[getTitle(cur)].push(cur)
  } else {
    prev[getTitle(cur)] = [cur]
  }
  return prev
}

function sortTodos(todosOnTopIds: string[], todosOnBottomIds: string[]) {
  return (a: InstanceType<Todo>, b: InstanceType<Todo>) => {
    const aId = a._id.toString()
    const bId = b._id.toString()
    if (
      (todosOnTopIds.includes(aId) && todosOnTopIds.includes(bId)) ||
      (todosOnBottomIds.includes(aId) && todosOnBottomIds.includes(bId)) ||
      (!todosOnTopIds.includes(aId) &&
        !todosOnTopIds.includes(bId) &&
        !todosOnBottomIds.includes(aId) &&
        !todosOnBottomIds.includes(bId))
    ) {
      return a.order < b.order ? -1 : 1
    } else if (todosOnTopIds.includes(aId)) {
      return -1
    } else if (todosOnTopIds.includes(bId)) {
      return 1
    } else if (todosOnBottomIds.includes(aId)) {
      return 1
    } else if (todosOnBottomIds.includes(bId)) {
      return -1
    } else {
      return a.order < b.order ? -1 : 1
    }
  }
}
