const dotenv = require('dotenv')
dotenv.config({ path: `${__dirname}/../.env` })
const axios = require('axios')
const flatten = require('flat')
const fs = require('fs')
const jsyaml = require('js-yaml')

const files = fs.readdirSync(`${__dirname}/../locales`)

const localizations = {}

for (const fileName of files) {
  if (!fileName.includes('yaml')) {
    continue
  }
  localizations[fileName.split('.')[0]] = jsyaml.safeLoad(
    fs.readFileSync(`${__dirname}/../locales/${fileName}`, 'utf8')
  )
}

const flattenedLocalizations = {}
Object.keys(localizations).forEach((language) => {
  flattenedLocalizations[language] = flatten(localizations[language])
})

const result = {}

const firstLanguage = Object.keys(flattenedLocalizations)[0]
Object.keys(flattenedLocalizations[firstLanguage]).forEach((key) => {
  const keyObject = {}
  for (const language in flattenedLocalizations) {
    if (flattenedLocalizations[language][key]) {
      keyObject[language] = flattenedLocalizations[language][key]
    }
  }
  result[key] = keyObject
})

// Add errors
const errorsResult = {}
const errors = require(`${__dirname}/../locales/errors.js`)
for (const key in errors) {
  errorsResult[`error.${key}`] = errors[key]
}

;(async function postLocalizations() {
  console.log('==== Posting body:')
  console.log(JSON.stringify(result, undefined, 2))
  console.log(JSON.stringify(errorsResult, undefined, 2))
  try {
    await axios.post(`https://localizer.todorant.com/localizations`, {
      localizations: result,
      password: process.env.PASSWORD,
      username: 'borodutch',
      tags: ['telegram'],
    })
    await axios.post(`https://localizer.todorant.com/localizations`, {
      localizations: errorsResult,
      password: process.env.PASSWORD,
      username: 'borodutch',
      tags: ['errors'],
    })
    console.error(`==== Body posted!`)
  } catch (err) {
    console.error(`==== Error posting: ${err.message}`)
  }
})()
