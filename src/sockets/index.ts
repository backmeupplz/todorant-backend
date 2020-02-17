import { createServer } from 'http'
import SocketIO = require('socket.io')
import { getUserFromToken } from '../middlewares/authenticate'
import { report } from '../helpers/report'

const server = createServer()
const io = SocketIO(server)

io.on('connection', socket => {
  socket.on('authorize', async (token: string) => {
    try {
      if (!token) {
        throw new Error('No token provided')
      }
      const user = await getUserFromToken(token)
      socket.join(user._id)
      socket.emit('authorized')
      setAuthorized(socket, true)
    } catch (err) {
      logout(socket)
      await report(err)
    }
  })
  socket.on('logout', async () => {
    logout(socket)
  })
})

function logout(socket: SocketIO.Socket) {
  socket.leaveAll()
  setAuthorized(socket, false)
}

function setAuthorized(socket: SocketIO.Socket, authorized: boolean) {
  ;(socket as any).authorized = authorized
}

function isAuthorized(socket: SocketIO.Socket) {
  return !!(socket as any).authorized
}

server.listen(3000).on('listening', () => {
  console.log('Sockets are listening on 3000')
})
