import { tryDeletingFile } from '@/helpers/telegram/helpers/deleteFile'
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ffmpeg = require('fluent-ffmpeg')
import * as temp from 'temp'

export async function getDuration(filepath: any) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filepath, (err, info) => {
      if (err) {
        reject(err)
        return
      }
      const fileSize = info.format.duration
      const output = temp.path({ suffix: '.flac' })

      ffmpeg()
        .on('error', (error) => {
          tryDeletingFile(output)
          reject(error)
        })
        .on('end', () => resolve({ flacPath: output, duration: fileSize }))
        .input(filepath)
        .setStartTime(0)
        .duration(fileSize)
        .output(output)
        .audioFrequency(16000)
        .toFormat('s16le')
        .run()
    })
  })
}
