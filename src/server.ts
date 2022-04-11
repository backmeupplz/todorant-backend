// Setup typegoose
import { Severity, setGlobalOptions } from '@typegoose/typegoose'
setGlobalOptions({
  options: {
    allowMixed: Severity.ALLOW,
  },
})
// Setup @/ aliases for modules
import 'module-alias/register'
// Get the rest of dependencies
import * as GracefulShutdown from 'http-graceful-shutdown'
import { app } from '@/app'
import { bot } from '@/helpers/telegram'
import { runMongo } from '@/models/index'
import { socketServer } from '@/sockets/io'

// Run mongo
runMongo().then(() => {
  console.log('Mongo connected')
})
// Start rest
app.listen(1337).on('listening', () => {
  console.log('HTTP is listening on 1337')
})
// Start sockets
socketServer.listen(3000).on('listening', () => {
  console.log('Sockets are listening on 3000')
})
// // Start telegram bot
// bot.launch().then(() => {
//   console.log('@todorant_bot launched')
// })

// Shutdown gracefully
GracefulShutdown(app, {
  onShutdown: async () => {
    await bot.stop()
    return new Promise((res) => {
      socketServer.close(() => {
        res()
      })
    })
  },
})
