import { daysBetween } from '@/helpers/daysBetween'

describe('Days between helper', () => {
  it('should count difference between full days', () => {
    const date1 = new Date(2020, 11, 15, 0, 0, 0, 0)
    const date2 = new Date(2020, 11, 18, 0, 0, 0, 0)

    expect(daysBetween(date1, date2)).toBe(3)
    expect(daysBetween(date2, date1)).toBe(3)
  })

  it('should count days as 24 hours', () => {
    const date1 = new Date(2020, 11, 15, 19, 0, 0, 0)
    const date2 = new Date(2020, 11, 16, 12, 0, 0, 0)

    expect(daysBetween(date1, date2)).toBe(0)
    expect(daysBetween(date2, date1)).toBe(0)
  })

  it('should correctly count days in February', () => {
    const leapYearDate1 = new Date(2020, 1, 29, 0, 0, 0, 0)
    const leapYearDate2 = new Date(2020, 2, 1, 0, 0, 0, 0)

    expect(daysBetween(leapYearDate1, leapYearDate2)).toBe(1)

    const notLeapYearDate1 = new Date(2021, 1, 28, 0, 0, 0, 0)
    const notLeapYearDate2 = new Date(2021, 2, 1, 0, 0, 0, 0)

    expect(daysBetween(notLeapYearDate1, notLeapYearDate2)).toBe(1)
  })

  it('should correctly count days between years', () => {
    const date1 = new Date(2020, 11, 31, 0, 0, 0, 0)
    const date2 = new Date(2021, 0, 2, 0, 0, 0, 0)

    expect(daysBetween(date1, date2)).toBe(2)

    const startOfLeapYear = new Date(2020, 0, 1, 0, 0, 0, 0)
    const startOfNotLeapYear = new Date(2021, 0, 1, 0, 0, 0, 0)
    expect(daysBetween(startOfLeapYear, startOfNotLeapYear)).toBe(366)
  })
})
