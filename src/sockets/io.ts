import { createServer } from 'http'
import * as SocketIO from 'socket.io'

export const socketServer = createServer()
export const io = SocketIO(socketServer, {
  maxHttpBufferSize: 5e10,
  pingTimeout: 30000,
})
