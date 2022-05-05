import { Todo } from '@/models/todo'

function getDateFromTime(date: string, time: string) {
  return new Date(
    parseInt(date.substr(0, 4)),
    parseInt(date.substr(5, 7)) - 1,
    parseInt(date.substr(8)),
    time ? parseInt(time.substr(0, 2)) : undefined,
    time ? parseInt(time.substr(3)) : undefined
  )
}

export function getDateString(date: Date) {
  return `${date.getFullYear()}-${
    date.getMonth() + 1 < 10 ? `0${date.getMonth() + 1}` : date.getMonth() + 1
  }-${date.getDate() < 10 ? `0${date.getDate()}` : date.getDate()}`
}

export function getDateMonthAndYearString(date: Date | string) {
  if (date instanceof Date) {
    return getDateString(date).substr(0, 7)
  }
  return date.substr(0, 7)
}

export function isTodoOld(
  todo: Todo,
  date: string,
  time: string,
  startTimeOfDay = '00:00'
) {
  const day = date.substr(8)
  const monthAndYear = date.substr(0, 7)
  const yesterday = `${parseInt(day) - 1}`
  const now = getDateFromTime(date, time)
  const todayStartDate = getDateFromTime(date, startTimeOfDay)
  const yesterdayDate = getDateFromTime(date, time)
  yesterdayDate.setDate(yesterdayDate.getDate() - 1)

  // Exact date exists or not
  if (todo.date) {
    if (todo.monthAndYear < monthAndYear) {
      return true
    }
    if (
      todo.monthAndYear === monthAndYear &&
      parseInt(todo.date) == parseInt(yesterday) &&
      now >= todayStartDate
    ) {
      return true
    }
    if (
      todo.monthAndYear === monthAndYear &&
      parseInt(todo.date) < parseInt(yesterday)
    ) {
      return true
    }
  } else {
    if (now < todayStartDate) {
      if (todo.monthAndYear <= getDateMonthAndYearString(yesterdayDate)) {
        return true
      }
    } else {
      if (todo.monthAndYear <= monthAndYear) {
        return true
      }
    }
  }
  return false
}
