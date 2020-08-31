const fs = require('fs')

export function tryDeletingFile(path) {
  try {
    fs.unlinkSync(path)
  } catch (err) {
    // do nothing
  }
}
