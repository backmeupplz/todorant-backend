import { Todo } from '@/models/todo'
import { completeTodo } from '@/__tests__/testUtils'
import { isTodoOld } from '@/helpers/isTodoOld'

describe('isTodoOld helper', () => {
  it('should detect if todo is old with todo\'s "month" property < 10', async () => {
    const todo = {
      ...completeTodo,
      monthAndYear: '2020-05',
      date: '21',
    } as Todo

    expect(isTodoOld(todo, '2020-05-22', '01:00')).toBe(true)
    expect(isTodoOld(todo, '2020-05-20', '01:00')).toBe(false)

    expect(isTodoOld(todo, '2019-05-22', '01:00')).toBe(false)
    expect(isTodoOld(todo, '2021-05-22', '01:00')).toBe(true)

    expect(isTodoOld(todo, '2020-04-21', '01:00')).toBe(false)
    expect(isTodoOld(todo, '2020-06-21', '01:00')).toBe(true)

    expect(isTodoOld(todo, '2019-06-21', '01:00')).toBe(false)
    expect(isTodoOld(todo, '2021-04-21', '01:00')).toBe(true)
  })

  it('should detect if todo is old with todo\'s "month" property >= 10', async () => {
    const todo = {
      ...completeTodo,
      monthAndYear: '2020-11',
      date: '21',
    } as Todo

    expect(isTodoOld(todo, '2020-11-20', '01:00')).toBe(false)
    expect(isTodoOld(todo, '2020-11-22', '01:00')).toBe(true)

    expect(isTodoOld(todo, '2019-11-22', '01:00')).toBe(false)
    expect(isTodoOld(todo, '2021-11-22', '01:00')).toBe(true)

    expect(isTodoOld(todo, '2020-10-21', '01:00')).toBe(false)
    expect(isTodoOld(todo, '2020-12-21', '01:00')).toBe(true)

    expect(isTodoOld(todo, '2019-12-21', '01:00')).toBe(false)
    expect(isTodoOld(todo, '2021-10-21', '01:00')).toBe(true)
  })

  it('should detect if todo is old without todo\'s "date" property', () => {
    const todoWithoutDate = {
      ...completeTodo,
      monthAndYear: '2020-05',
      date: null,
    } as Todo

    expect(isTodoOld(todoWithoutDate, '2020-04-20', '00:00')).toBe(false)
    expect(isTodoOld(todoWithoutDate, '2020-05-20', '00:00')).toBe(true)
    expect(isTodoOld(todoWithoutDate, '2019-05-20', '00:00')).toBe(false)
    expect(isTodoOld(todoWithoutDate, '2020-10-20', '00:00')).toBe(true)
  })

  it('should detect if todo is old with non-default startTimeOfDay', async () => {
    const todo = {
      ...completeTodo,
      monthAndYear: '2020-05',
      date: '21',
    } as Todo

    expect(isTodoOld(todo, '2020-05-22', '03:00', '04:20')).toBe(false)
    expect(isTodoOld(todo, '2020-05-22', '05:00', '04:20')).toBe(true)

    const todoWithoutDate = {
      ...completeTodo,
      monthAndYear: '2020-10',
      date: null,
    } as Todo

    expect(isTodoOld(todoWithoutDate, '2020-10-01', '03:00', '04:20')).toBe(
      false
    )
    expect(isTodoOld(todoWithoutDate, '2020-10-01', '05:00', '04:20')).toBe(
      true
    )
  })
})
