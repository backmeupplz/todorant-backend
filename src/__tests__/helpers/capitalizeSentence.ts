import { capitalizeSentence } from '@/helpers/capitalizeSentence'

describe('Capitalize sentence helper', () => {
  it('should capitalize first letters in simple strings', () => {
    expect(capitalizeSentence('do this')).toBe('Do this')
    expect(capitalizeSentence('Do that')).toBe('Do that')
  })

  it('should capitalize first letters in strings with dots', () => {
    expect(capitalizeSentence('Do this. do that')).toBe('Do this. Do that')
    expect(capitalizeSentence('do this...do that')).toBe('Do this...Do that')
  })

  it('should capitalize first letters in strings with question marks', () => {
    expect(capitalizeSentence('do this? do that?')).toBe('Do this? Do that?')
  })

  it('should capitalize first letters in strings with exclamation marks', () => {
    expect(capitalizeSentence('do this! do that')).toBe('Do this! Do that')
  })

  it('should capitalize first letters in strings with combinations of punctuation marks', () => {
    expect(capitalizeSentence('count 3 * 2.3. then have phun')).toBe(
      'Count 3 * 2.3. Then have phun'
    )
    expect(capitalizeSentence('do this?! do that?!')).toBe(
      'Do this?! Do that?!'
    )
  })
})
