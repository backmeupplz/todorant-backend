import { _d, _e } from '@/helpers/encryption'

describe('Encryption helper', () => {
  it('should decrypt with the correct password', async () => {
    const text = 'some text'
    const password = 'test'
    const encrypted = _e(text, password)
    const decrypted = _d(encrypted, password)
    expect(decrypted).toBe(text)
  })

  it('should return empty string on incorrect password', async () => {
    const text = 'some text'
    const password = 'test'
    const encrypted = _e(text, password)
    const decrypted = _d(encrypted, 'wrongPassword')
    expect(decrypted).toBe('')
  })
})
