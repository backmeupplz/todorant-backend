import { getTags } from '@/helpers/getTags'
import { completeTodo } from '../testUtils'
import { v4 } from 'uuid'
import { _e } from '@/helpers/encryption'

const firstText = `#test ${v4()} #test1`
const secondText = `${v4()} #test2 ${v4()} #test3`

const tags = ['test', 'test1', 'test2', 'test3']

const correctPassword = '12345'
const wrongPassword = '54321'

const firstNonEncryptedTodo = {
  ...completeTodo,
  text: firstText,
}
const secondNonEncryptedTodo = {
  ...completeTodo,
  text: secondText,
}

const firstEncrypted = {
  ...completeTodo,
  text: _e(firstText, correctPassword),
  encrypted: true,
}

const secondEncrypted = {
  ...completeTodo,
  text: _e(secondText, correctPassword),
  encrypted: true,
}

const todoWithotTags = {
  ...completeTodo,
}

describe('Gettings tags from todos', () => {
  it('should return tags from array with non-encrypted todos', () => {
    expect(
      getTags([firstNonEncryptedTodo, secondNonEncryptedTodo], undefined)
    ).toStrictEqual(tags)
  })
  it('should return tags from array with encrypted todos and correct password', () => {
    expect(
      getTags([firstEncrypted, secondEncrypted], correctPassword)
    ).toStrictEqual(tags)
  })
  it('should return empty tags array from array with encrypted todos and wrong password', () => {
    expect(
      getTags([firstEncrypted, secondEncrypted], wrongPassword)
    ).toStrictEqual([])
  })
  it('should return tags from mixed array with encrypted and non-encrypted todos', () => {
    expect(
      getTags(
        [
          firstNonEncryptedTodo,
          secondNonEncryptedTodo,
          firstEncrypted,
          secondEncrypted,
        ],
        correctPassword
      )
    ).toStrictEqual(tags.concat(tags))
  })
  it('should return empty array from array with todos without tags', () => {
    expect(getTags([todoWithotTags], undefined)).toStrictEqual([])
  })
})
