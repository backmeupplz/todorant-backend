// eslint-disable-next-line @typescript-eslint/no-var-requires
const errorsTemplate = require('../../locales/errors.js')

export const errors: { [index: string]: string } = Object.keys(
  errorsTemplate
).reduce((prev, cur) => {
  prev[cur] = JSON.stringify(errorsTemplate[cur])
  return prev
}, {})
