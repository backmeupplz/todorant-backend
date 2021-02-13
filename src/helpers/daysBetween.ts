export function daysBetween(date1: Date, date2: Date) {
  const oneDay = 1000 * 60 * 60 * 24
  const date1Ms = date1.getTime()
  const date2Ms = date2.getTime()
  const difference_ms = Math.abs(date1Ms - date2Ms)
  return Math.floor(difference_ms / oneDay)
}
