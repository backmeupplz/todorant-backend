import { omit } from 'lodash'
import { createServer } from 'http'
import SocketIO = require('socket.io')
import { getUserFromToken } from '../middlewares/authenticate'
import { report } from '../helpers/report'
import { User, TodoModel, Todo, Settings, UserModel } from '../models'
import { InstanceType } from 'typegoose'

const server = createServer()
const io = SocketIO(server)

function setupSync<T>(
  socket: SocketIO.Socket,
  name: string,
  getObjects: (
    user: InstanceType<User>,
    lastSyncDate: Date | undefined
  ) => Promise<T>,
  onPushObjects: (
    objects: T
  ) => Promise<{ objectsToPushBack: T; needsSync: boolean }>
) {
  socket.on(`sync_${name}`, async (lastSyncDate: Date | undefined) => {
    const user = getUser(socket)
    if (!isAuthorized(socket) || !user) {
      return
    }
    socket.emit(name, await getObjects(user, lastSyncDate))
  })
  socket.on(`push_${name}`, async (pushId: string, objects: T) => {
    try {
      const { objectsToPushBack, needsSync } = await onPushObjects(objects)
      socket.emit(`${name}_pushed`, pushId, objectsToPushBack)
      if (needsSync) {
        socket.to(getUser(socket)._id).emit(`${name}_sync_request`)
      }
    } catch (err) {
      socket.emit(`${name}_pushed_error`, pushId, err)
    }
  })
}

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

  setupSync<Todo[]>(
    socket,
    'todos',
    async (user: InstanceType<User>, lastSyncDate: Date | undefined) => {
      const query = { user: user._id } as any
      if (lastSyncDate) {
        query.updatedAt = { $gt: lastSyncDate }
      }
      return (await TodoModel.find(query)).map(t => t.stripped())
    },
    async todos => {
      const savedTodos = await Promise.all(
        todos.map(
          todo =>
            new Promise<InstanceType<Todo>>(async (res, rej) => {
              try {
                if (!todo._id) {
                  const dbtodo = new TodoModel({
                    ...todo,
                    user: getUser(socket)._id,
                  })
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
      return {
        objectsToPushBack: savedTodos.map(t => t.stripped()),
        needsSync: !!todos.length,
      }
    }
  )

  socket.on('push_settings', async (pushId: string, settings: Settings) => {
    try {
      const user = await UserModel.findById(getUser(socket)._id)
      if (!user) {
        throw new Error('User not found')
      }
      user.settings = { ...(user.settings || {}), ...settings }
      user.settings.updatedAt = new Date()
      await user.save()
      socket.emit('settings_pushed', pushId, user.settings)
      socket.to(getUser(socket)._id).emit('sync_request')
    } catch (err) {
      socket.emit('settings_pushed_error', pushId, err)
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

export function requestSync(userId: string) {
  io.to(userId).emit('sync_request')
}
