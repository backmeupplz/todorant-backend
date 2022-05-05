import { DocumentType } from '@typegoose/typegoose'
import { Todo, TodoModel, getTitle } from '@/models/todo'
import { User } from '@/models/user'

export async function fixOrder(
  user: DocumentType<User>,
  titlesInvolved: string[],
  addTodosOnTop = [] as Todo[],
  addTodosToBottom = [] as Todo[],
  timeTodosToYield = [] as Todo[]
) {
  const allTodos = await TodoModel.find({ user: user._id, deleted: false })
  const completedTodos = allTodos.filter((t) => t.completed)
  const uncompletedTodos = allTodos.filter((t) => !t.completed)
  const completedTodosMap = completedTodos.reduce(mapTodos, {})
  const uncompletedTodosMap = uncompletedTodos.reduce(mapTodos, {})
  const addTodosOnTopIds = addTodosOnTop
    ? addTodosOnTop.map((t) => t._id.toString())
    : []
  const addTodosToBottomIds = addTodosToBottom
    ? addTodosToBottom.map((t) => t._id.toString())
    : []
  const todosToSave = [] as DocumentType<Todo>[]
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
    // Fix exact times
    if (user.settings.preserveOrderByTime) {
      while (!isTimeSorted(orderedUncompleted)) {
        fixOneTodoTime(orderedUncompleted, timeTodosToYield)
      }
    }
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
  prev: { [index: string]: DocumentType<Todo>[] },
  cur: DocumentType<Todo>
) {
  if (prev[getTitle(cur)]) {
    prev[getTitle(cur)].push(cur)
  } else {
    prev[getTitle(cur)] = [cur]
  }
  return prev
}

function isTimeSorted(todos: Todo[]) {
  const result = true
  let time: number | undefined
  for (const todo of todos) {
    if (todo.time) {
      if (time !== undefined) {
        const todoTime = minutesFromTime(todo.time)
        if (todoTime < time) {
          return false
        } else {
          time = todoTime
        }
      } else {
        time = minutesFromTime(todo.time)
      }
    }
  }
  return result
}

function fixOneTodoTime(todos: Todo[], timeTodosToYield: Todo[]) {
  const timeTodosToYieldIds = timeTodosToYield.map(
    (t) => t._id || t._tempSyncId
  )
  let time: number | undefined
  let prevTodoWithTimeIndex: number | undefined
  let i = 0
  for (const todo of todos) {
    if (todo.time) {
      if (time !== undefined && prevTodoWithTimeIndex != undefined) {
        const todoTime = minutesFromTime(todo.time)
        if (todoTime < time) {
          const prevTodo = todos[prevTodoWithTimeIndex]
          const curTodo = todo
          // Fix
          if (
            timeTodosToYieldIds.indexOf(curTodo._id || curTodo._tempSyncId) > -1
          ) {
            // Current should be moved
            todos.splice(i, 1)
            todos.splice(prevTodoWithTimeIndex, 0, curTodo)
          } else {
            // Prev todo should be moved
            todos.splice(prevTodoWithTimeIndex, 1)
            todos.splice(i, 0, prevTodo)
          }
          // Halt this function
          return
        } else {
          time = todoTime
          prevTodoWithTimeIndex = i
        }
      } else {
        time = minutesFromTime(todo.time)
        prevTodoWithTimeIndex = i
      }
    }
    i++
  }
}

function minutesFromTime(time: string) {
  const components = time.split(':').map((c) => parseInt(c, 10))
  return components[0] * 60 + components[1]
}

function sortTodos(todosOnTopIds: string[], todosOnBottomIds: string[]) {
  return (a: DocumentType<Todo>, b: DocumentType<Todo>) => {
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
