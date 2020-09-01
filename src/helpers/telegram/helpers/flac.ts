import { tryDeletingFile } from './deleteFile'
const ffmpeg = require('fluent-ffmpeg')
const temp = require('temp')

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
