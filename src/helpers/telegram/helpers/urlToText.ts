import { getText } from '@/helpers/telegram/helpers/speechApi'
import { tryDeletingFile } from '@/helpers/telegram/helpers/deleteFile'
import { getDuration } from '@/helpers/telegram/helpers/flac'
const temp = require('temp')
const fs = require('fs')
const download = require('download')

export async function urlToText(url, witLanguage) {
  const ogaPath = temp.path({ suffix: '.oga' })
  try {
    const data = await download(url)
    fs.writeFileSync(ogaPath, data)
  } catch (err) {
    tryDeletingFile(ogaPath)
    console.log(err.message)
    throw err
  }
  let flacPath
  let duration
  try {
    const result: any = await getDuration(ogaPath)
    flacPath = result.flacPath
    duration = result.duration
  } catch (err) {
    tryDeletingFile(ogaPath)
    console.log(err.message)
    throw err
  }
  try {
    // Get transcription
    const textArr = await getText(witLanguage, duration, ogaPath)
    // Return result
    return textArr
  } catch (err) {
    console.log(err.message)
    throw err
  } finally {
    tryDeletingFile(flacPath)
    // No need for oga file anymore
    tryDeletingFile(ogaPath)
  }
}
