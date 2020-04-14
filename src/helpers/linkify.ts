import Linkify = require('linkify-it')

export const linkify = Linkify()
linkify.add('#', {
  validate: (text, pos) => {
    const tail = text.slice(pos - 1)
    const result = /[\u0400-\u04FFa-zA-Z_0-9]+/.exec(tail)
    return result ? result[0].length : 0
  },
})
