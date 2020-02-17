import { omit } from 'lodash'
import { createServer } from 'http'
import SocketIO = require('socket.io')
import { getUserFromToken } from '../middlewares/authenticate'
import { report } from '../helpers/report'
import { User, TodoModel, Todo } from '../models'
import { InstanceType } from 'typegoose'

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
      setUser(socket, user)
    } catch (err) {
      logout(socket)
      await report(err)
    }
  })
  socket.on('logout', async () => {
    logout(socket)
  })
  socket.on('sync', async (lastSyncDate: Date | undefined) => {
    const user = getUser(socket)
    if (!isAuthorized(socket) || !user) {
      return
    }
    const query = { user: user._id } as any
    if (lastSyncDate) {
      query.updatedAt = { $gt: lastSyncDate }
    }
    const todos = await TodoModel.find(query)
    socket.emit(
      'todos',
      todos.map(t => t.stripped())
    )
  })
  socket.on('push', async (pushId: string, todos: Todo[]) => {
    try {
      const savedTodos = await Promise.all(
        todos.map(
          todo =>
            new Promise<InstanceType<Todo>>(async (res, rej) => {
              try {
                if (!todo._id) {
                  const dbtodo = new TodoModel(todo)
                  const savedTodo = await dbtodo.save()
                  savedTodo._tempSyncId = todo._tempSyncId
                  res(savedTodo)
                } else {
                  const dbtodo = await TodoModel.findById(todo._id)
                  if (!dbtodo) {
                    return rej(new Error('Todo not found'))
                  }
                  Object.assign(dbtodo, omit(todo, '_id'))
                  const savedTodo = await dbtodo.save()
                  savedTodo._tempSyncId = todo._tempSyncId
                  res(savedTodo)
                }
              } catch (err) {
                rej(err)
              }
            })
        )
      )
      socket.emit(
        'todos_pushed',
        pushId,
        savedTodos.map(t => t.stripped())
      )
    } catch (err) {
      socket.emit('todos_pushed_error', pushId, err)
    }
  })
})

function logout(socket: SocketIO.Socket) {
  socket.leaveAll()
  setAuthorized(socket, false)
  setUser(socket, undefined)
}

function setAuthorized(socket: SocketIO.Socket, authorized: boolean) {
  ;(socket as any).authorized = authorized
}

function setUser(socket: SocketIO.Socket, user: InstanceType<User>) {
  ;(socket as any).user = user
}

function isAuthorized(socket: SocketIO.Socket) {
  return !!(socket as any).authorized
}

function getUser(socket: SocketIO.Socket): InstanceType<User> | undefined {
  return (socket as any).user
}

server.listen(3000).on('listening', () => {
  console.log('Sockets are listening on 3000')
})
