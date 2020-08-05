import { Hero, getOrCreateHero, HeroModel } from '../models/hero'
import { omit } from 'lodash'
import { createServer } from 'http'
import SocketIO = require('socket.io')
import { getUserFromToken } from '../middlewares/authenticate'
import { report } from '../helpers/report'
import {
  User,
  TodoModel,
  Todo,
  Settings,
  UserModel,
  Tag,
  TagModel,
} from '../models'
import { InstanceType } from 'typegoose'
import { updateTodos, getGoogleCalendarApi } from '../helpers/googleCalendar'
import { isUserSubscribed } from '../helpers/isUserSubscribed'
import { errors } from '../helpers/errors'

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
    objects: T,
    password?: string
  ) => Promise<{ objectsToPushBack: T; needsSync: boolean }>
) {
  socket.on(`sync_${name}`, async (lastSyncDate: Date | undefined) => {
    const user = getUser(socket)
    if (!isAuthorized(socket) || !user) {
      return
    }
    socket.emit(name, await getObjects(user, lastSyncDate))
  })
  socket.on(
    `push_${name}`,
    async (pushId: string, objects: T, password?: string) => {
      try {
        const { objectsToPushBack, needsSync } = await onPushObjects(
          objects,
          password
        )
        socket.emit(`${name}_pushed`, pushId, objectsToPushBack)
        if (needsSync) {
          socket.broadcast.to(getUser(socket)._id).emit(`${name}_sync_request`)
        }
      } catch (err) {
        socket.emit(`${name}_pushed_error`, pushId, err)
      }
    }
  )
}

io.on('connection', (socket) => {
  socket.on('authorize', async (token: string) => {
    try {
      if (!token) {
        throw new Error('No token provided')
      }
      const user = await getUserFromToken(token)
      if (!user) {
        return
      }
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
      if (!isUserSubscribed(user)) {
        throw new Error(errors.subscription)
      }
      const query = { user: user._id } as any
      if (lastSyncDate) {
        query.updatedAt = { $gt: lastSyncDate }
      }
      return (await TodoModel.find(query)).map((t) => t.stripped())
    },
    async (todos, password) => {
      const savedTodos = await Promise.all(
        todos.map(
          (todo) =>
            new Promise<InstanceType<Todo>>(async (res, rej) => {
              try {
                if (!todo._id) {
                  const dbtodo = new TodoModel({
                    ...omit(todo, '_id'),
                    user: getUser(socket)._id,
                  })
                  const savedTodo = await dbtodo.save()
                  savedTodo._tempSyncId = todo._tempSyncId
                  res(savedTodo as any)
                } else {
                  const dbtodo = await TodoModel.findById(todo._id)
                  if (!dbtodo) {
                    return rej(new Error('Todo not found'))
                  }
                  if (
                    dbtodo.user.toString() !== getUser(socket)._id.toString()
                  ) {
                    return rej(new Error('Not authorized'))
                  }
                  Object.assign(dbtodo, omit(todo, '_id'))
                  const savedTodo = await dbtodo.save()
                  savedTodo._tempSyncId = todo._tempSyncId
                  res(savedTodo as any)
                }
              } catch (err) {
                rej(err)
              }
            })
        )
      )
      // Update calendar
      updateTodos(
        savedTodos,
        getUser(socket).settings.googleCalendarCredentials,
        password
      )
      return {
        objectsToPushBack: savedTodos.map((t) => t.stripped()),
        needsSync: !!todos.length,
      }
    }
  )

  setupSync<Tag[]>(
    socket,
    'tags',
    async (user: InstanceType<User>, lastSyncDate: Date | undefined) => {
      const query = { user: user._id } as any
      if (lastSyncDate) {
        query.updatedAt = { $gt: lastSyncDate }
      }
      return (await TagModel.find(query)).map((t) => t.stripped())
    },
    async (tags) => {
      const savedTags = await Promise.all(
        tags.map(
          (tag) =>
            new Promise<InstanceType<Tag>>(async (res, rej) => {
              try {
                if (!tag._id) {
                  const dbtag = new TagModel({
                    ...omit(tag, '_id'),
                    user: getUser(socket)._id,
                  })
                  const savedTag = await dbtag.save()
                  savedTag._tempSyncId = tag._tempSyncId
                  res(savedTag as any)
                } else {
                  const dbtag = await TagModel.findById(tag._id)
                  if (!dbtag) {
                    return rej(new Error('Tag not found'))
                  }
                  if (
                    dbtag.user.toString() !== getUser(socket)._id.toString()
                  ) {
                    return rej(new Error('Not authorized'))
                  }
                  Object.assign(dbtag, omit(tag, '_id'))
                  const savedTag = await dbtag.save()
                  savedTag._tempSyncId = tag._tempSyncId
                  res(savedTag as any)
                }
              } catch (err) {
                rej(err)
              }
            })
        )
      )
      return {
        objectsToPushBack: savedTags.map((t) => t.stripped()),
        needsSync: !!savedTags.length,
      }
    }
  )

  setupSync<Settings>(
    socket,
    'settings',
    async (user) => {
      const dbuser = await UserModel.findById(user._id)
      if (!dbuser) {
        throw new Error('User not found')
      }
      return dbuser.settings
    },
    async (settings) => {
      const user = await UserModel.findById(getUser(socket)._id)
      if (!user) {
        throw new Error('User not found')
      }
      user.settings = { ...(user.settings || {}), ...settings }
      if (settings.googleCalendarCredentials === undefined) {
        const api = getGoogleCalendarApi(
          user.settings.googleCalendarCredentials
        )
        const resourceId = user.googleCalendarResourceId
        try {
          await api.channels.stop({
            requestBody: {
              id: user._id,
              resourceId: resourceId,
            },
          })
        } catch (err) {
          console.log(err)
        }
        user.settings.googleCalendarCredentials = undefined
      }
      user.settings.updatedAt = new Date()
      await user.save()
      return {
        objectsToPushBack: user.settings,
        needsSync: true,
      }
    }
  )

  setupSync<Hero>(
    socket,
    'hero',
    async (user) => {
      const hero = await getOrCreateHero(user._id)
      return hero
    },
    async (hero) => {
      const dbhero = await HeroModel.findOne({ user: getUser(socket)._id })
      if (!dbhero) {
        throw new Error('Hero not found')
      }
      dbhero.points = hero.points
      await dbhero.save()
      return {
        objectsToPushBack: dbhero,
        needsSync: true,
      }
    }
  )

  setupSync<Partial<User>>(
    socket,
    'user',
    async (user) => {
      const dbuser = await UserModel.findById(user._id)
      if (!dbuser) {
        throw new Error('User not found')
      }
      return dbuser.stripped(true, false)
    },
    async (user) => {
      const dbuser = await UserModel.findById(getUser(socket)._id)
      if (!dbuser) {
        throw new Error('User not found')
      }
      Object.assign(
        dbuser,
        omit(user, [
          'settings',
          'id',
          '_id',
          'token',
          'anonymousToken',
          'subscriptionStatus',
          'subscriptionId',
          'appleReceipt',
          'googleReceipt',
          'createdAt',
          'updatedAt',
        ])
      )
      await dbuser.save()
      return {
        objectsToPushBack: dbuser.stripped(true, false),
        needsSync: true,
      }
    }
  )
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
  io.to(userId).emit('todos_sync_request')
  io.to(userId).emit('tags_sync_request')
  io.to(userId).emit('settings_sync_request')
  io.to(userId).emit('user_sync_request')
}
