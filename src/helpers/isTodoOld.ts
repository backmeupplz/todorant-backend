// Dependencies
import { Todo } from '../models'

function getDateFromTime(date: string, time: string) {
  return new Date(
    parseInt(date.substr(0, 4)),
    parseInt(date.substr(5, 7)),
    parseInt(date.substr(8)),
    parseInt(time.substr(0, 2)),
    parseInt(time.substr(3))
  )
}

export function isTodoOld(
  todo: Todo,
  date: string,
  time: string,
  startTimeOfDay: any
) {
  const day = date.substr(8)
  const monthAndYear = date.substr(0, 7)
  const yesterday = `${parseInt(day) - 1}`
  if (!startTimeOfDay) startTimeOfDay = '00:00'
  const now = getDateFromTime(date, time)
  const todayDate = getDateFromTime(date, startTimeOfDay)

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
