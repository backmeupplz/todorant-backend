import * as SocketIO from 'socket.io'
import { createServer } from 'http'

export const socketServer = createServer()
export const io = SocketIO(socketServer, {
  maxHttpBufferSize: 9e10,
  pingTimeout: 30000,
})
