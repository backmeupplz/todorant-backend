import { isTodoOld } from '@/helpers/isTodoOld'
import { completeTodo } from '@/__tests__/testUtils'

describe('isTodoOld helper', () => {
  it('should detect if todo is old with todo\'s "month" property < 10', async () => {
    const todo = {
      ...completeTodo,
      monthAndYear: '05-2020',
      date: '21',
    }

    expect(isTodoOld(todo, '05-2020-20', '01:00')).toBe(false)
    expect(isTodoOld(todo, '05-2020-22', '01:00')).toBe(true)

    expect(isTodoOld(todo, '05-2019-22', '01:00')).toBe(false)
    expect(isTodoOld(todo, '05-2021-22', '01:00')).toBe(true)

    expect(isTodoOld(todo, '04-2020-21', '01:00')).toBe(false)
    expect(isTodoOld(todo, '06-2020-21', '01:00')).toBe(true)

    expect(isTodoOld(todo, '06-2019-21', '01:00')).toBe(false)
    expect(isTodoOld(todo, '04-2021-21', '01:00')).toBe(true)
  })

  it('should detect if todo is old with todo\'s "month" property >= 10', async () => {
    const todo = {
      ...completeTodo,
      monthAndYear: '11-2020',
      date: '21',
    }

    expect(isTodoOld(todo, '11-2020-20', '01:00')).toBe(false)
    expect(isTodoOld(todo, '11-2020-22', '01:00')).toBe(true)

    expect(isTodoOld(todo, '11-2019-22', '01:00')).toBe(false)
    expect(isTodoOld(todo, '11-2021-22', '01:00')).toBe(true)

    expect(isTodoOld(todo, '10-2020-21', '01:00')).toBe(false)
    expect(isTodoOld(todo, '12-2020-21', '01:00')).toBe(true)

    expect(isTodoOld(todo, '12-2019-21', '01:00')).toBe(false)
    expect(isTodoOld(todo, '10-2021-21', '01:00')).toBe(true)
  })

  it('should detect if todo is old without todo\'s "date" property', () => {
    const todoWithoutDate = {
      ...completeTodo,
      monthAndYear: '05-2020',
      date: null,
    }

    expect(isTodoOld(todoWithoutDate, '04-2020-20', '00:00')).toBe(false)
    expect(isTodoOld(todoWithoutDate, '05-2020-20', '00:00')).toBe(true)
    expect(isTodoOld(todoWithoutDate, '05-2019-20', '00:00')).toBe(false)
    expect(isTodoOld(todoWithoutDate, '10-2020-20', '00:00')).toBe(true)
  })

  it('should detect if todo is old with not default startTimeOfDay', async () => {
    const todo = {
      ...completeTodo,
      monthAndYear: '05-2020',
      date: '21',
    }

    expect(isTodoOld(todo, '05-2020-21', '03:00', '04:20')).toBe(false)
    expect(isTodoOld(todo, '05-2020-21', '05:00', '04:20')).toBe(true)

    const todoWithoutDate = {
      ...completeTodo,
      monthAndYear: '10-2020',
      date: null,
    }

    expect(isTodoOld(todoWithoutDate, '10-2020-31', '03:00', '04:20')).toBe(
      false
    )
    expect(isTodoOld(todoWithoutDate, '10-2020-31', '05:00', '04:20')).toBe(
      true
    )
  })
})
