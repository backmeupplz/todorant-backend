import * as temp from 'temp'
import { tryDeletingFile } from '@/helpers/telegram/helpers/deleteFile'
import { witLanguages } from '@/helpers/telegram/helpers/witLanguage'
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ffmpeg = require('fluent-ffmpeg')
import * as fs from 'fs'
import * as https from 'https'

export async function getText(witLanguage, duration, ogaPath) {
  const token = witLanguages[witLanguage]
  const paths = await splitPath(ogaPath, duration)
  const savedPaths = paths.slice()
  try {
    let result = []
    while (paths.length) {
      const pathsToRecognize = paths.splice(0, 5)
      const pathsToDelete = pathsToRecognize.slice()
      const promises = []
      for (const path of pathsToRecognize) {
        promises.push(
          new Promise(async (res, rej) => {
            let triesCount = 5
            let error
            while (triesCount > 0) {
              try {
                const text = await recognizePath(path, token)
                res(text)
                return
              } catch (err) {
                error = err
                triesCount -= 1
                if (
                  err.message.indexOf('Max audio length is 20 seconds') > -1
                ) {
                  break
                }
                console.info(
                  `Retrying ${witLanguage} ${path}, attempts left — ${triesCount}, error: ${err.message} (${err.code})`
                )
              }
            }
            error.message = `${error.message} (${duration}s)`
            rej(error)
          })
        )
      }
      try {
        const responses = await Promise.all(promises)
        result = result.concat(responses.map((r) => (r || '').trim()))
        // eslint-disable-next-line no-useless-catch
      } catch (err) {
        throw err
      } finally {
        for (const path of pathsToDelete) {
          tryDeletingFile(path)
        }
      }
    }
    return result.length < 2
      ? [result[0]]
      : result.reduce((p, c, i, a) => {
          if (a.length - 1 === i) {
            return p.concat([[c]])
          }
          return p.concat([[c]])
        }, [])
  } finally {
    // Try deleting the files one more time
    for (const path of savedPaths) {
      tryDeletingFile(path)
    }
  }
}

function splitPath(path, duration) {
  const trackLength = 15
  const lastTrackLength = duration % trackLength

  const promises = []
  for (let i = 0; i < duration; i += trackLength) {
    const output = temp.path({ suffix: '.flac' })
    promises.push(
      new Promise((res, rej) => {
        ffmpeg()
          .input(path)
          .on('error', (error) => {
            rej(error)
          })
          .on('end', () => res(output))
          .output(output)
          .setStartTime(i)
          .duration(i + trackLength < duration ? trackLength : lastTrackLength)
          .audioFrequency(16000)
          .toFormat('s16le')
          .run()
      })
    )
  }
  return Promise.all(promises)
}

async function recognizePath(path, token) {
  return new Promise((resolve, reject) => {
    const options = {
      method: 'POST',
      hostname: 'api.wit.ai',
      port: null,
      path: '/speech?v=20170307',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type':
          'audio/raw;encoding=signed-integer;bits=16;rate=16000;endian=little',
        'cache-control': 'no-cache',
      },
      timeout: 120 * 1000,
    }
    const req = https.request(options, (res) => {
      const chunks = []

      res.on('data', (chunk) => {
        chunks.push(chunk)
      })

      res.on('end', () => {
        try {
          const body = Buffer.concat(chunks)
          const json = JSON.parse(body.toString())
          if (json.error) {
            const error = new Error(json.error)
            error.name = json.code
            try {
              reject(error)
            } catch (err) {
              // Do nothing
            }
          } else {
            try {
              resolve(json._text)
            } catch (err) {
              // Do nothing
            }
          }
        } catch (err) {
          try {
            reject(err)
          } catch (error) {
            // Do nothing
          }
        }
      })

      res.on('error', (err) => {
        try {
          reject(err)
        } catch (error) {
          // Do nothing
        }
      })
    })

    req.on('error', (err) => {
      try {
        reject(err)
      } catch (error) {
        // Do nothing
      }
    })

    const stream = fs.createReadStream(path)
    stream.pipe(req)
    let error
    stream.on('error', (err) => {
      error = err
    })
    stream.on('close', () => {
      if (error) {
        try {
          reject(error)
        } catch (err) {
          // Do nothing
        }
      }
    })
  })
}
