export const witLanguages = JSON.parse(process.env.WIT_LANGUAGES || '{}')

const witCodes = {
  English: 'en',
  Italian: 'it',
  Russian: 'ru',
  Ukrainian: 'ua',
}

export function languageForCode(code) {
  let language
  Object.keys(witCodes).forEach((key) => {
    const value = witCodes[key]
    if (value.includes(code)) {
      language = key
    }
  })
  return language
}
