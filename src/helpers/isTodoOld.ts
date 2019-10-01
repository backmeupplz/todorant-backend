// Dependencies
import { Todo } from '../models'

export function isTodoOld(todo: Todo, date: string) {
  const day = date.substr(8)
  const monthAndYear = date.substr(0, 7)

  // Exact date exists or not
  if (todo.date) {
    if (todo.monthAndYear < monthAndYear) {
      return true
    }
    if (todo.monthAndYear === monthAndYear && todo.date < day) {
      return true
    }
  } else {
    if (todo.monthAndYear <= monthAndYear) {
      return true
    }
  }
  return false
}
