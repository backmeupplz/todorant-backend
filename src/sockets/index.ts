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
    } catch (err) {
      socket.leaveAll()
      await report(err)
    }
  })
  socket.on('logout', async () => {
    try {
      socket.leaveAll()
    } catch (err) {
      await report(err)
    }
  })
})

server.listen(3000).on('listening', () => {
  console.log('Sockets are listening on 3000')
})
