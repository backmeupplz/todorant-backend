import { Todo } from '../models/todo'
import { linkify } from './linkify'
import { _d } from './encryption'

export function getTags(todos: Todo[], password: any) {
  return todos
    .map((todo) => {
      let text = todo.text
      if (todo.encrypted && password) {
        text = _d(todo.text, password)
      }
      return linkify.match(text) || []
    })
    .reduce((p, c) => p.concat(c), [])
    .filter((m) => /^#[\u0400-\u04FFa-zA-Z_0-9/]+$/u.test(m.url))
    .map((m) => m.url.substr(1))
}
