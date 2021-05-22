import { createServer } from 'http'
import * as SocketIO from 'socket.io'

export const socketServer = createServer()
export const io = SocketIO(socketServer)
