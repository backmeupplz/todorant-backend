import { AES, enc } from 'crypto-js'

export function _e(value: string, key: string) {
  return AES.encrypt(value, key).toString()
}

export function _d(value: string, key: string) {
  try {
    const bytes = AES.decrypt(value, key)
    return bytes.toString(enc.Utf8)
  } catch (err) {
    return ''
  }
}
