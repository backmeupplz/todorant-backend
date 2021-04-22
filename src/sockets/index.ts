import { getGoogleCalendarApi, updateTodos } from '@/helpers/googleCalendar'
import { report } from '@/helpers/report'
import { getUserFromToken } from '@/middlewares/authenticate'
import { getOrCreateHero, Hero, HeroModel } from '@/models/hero'
import { Tag, TagModel } from '@/models/tag'
import { Todo, TodoModel } from '@/models/todo'
import { Settings, User, UserModel } from '@/models/user'
import { DocumentType } from '@typegoose/typegoose'
import { createServer } from 'http'
import { omit } from 'lodash'
import * as randToken from 'rand-token'
import SocketIO = require('socket.io')

export const socketServer = createServer()
const io = SocketIO(socketServer)

const apiVersion = 2

function setupSync<T>(
  socket: SocketIO.Socket,
  name: string,
  getObjects: (
    user: DocumentType<User>,
    lastSyncDate: Date | undefined
  ) => Promise<T>,
  onPushObjects: (
    objects: T,
    password?: string
  ) => Promise<{ objectsToPushBack: T; needsSync: boolean }>
) {
  socket.on(
    `sync_${name}`,
    async (lastSyncDate: Date | undefined, syncId: string) => {
      const user = getUser(socket)
      if (!isAuthorized(socket) || !user) {
        socket.emit(`${name}_sync_error`, 'Not authorized', syncId)
        return
      }
      socket.emit(name, await getObjects(user, lastSyncDate), syncId)
    }
  )
  socket.on(
    `push_${name}`,
    async (syncId: string, objects: T, password?: string) => {
      try {
        const { objectsToPushBack, needsSync } = await onPushObjects(
          objects,
          password
        )
        socket.emit(`${name}_pushed`, objectsToPushBack, syncId)
        if (needsSync) {
          socket.broadcast.to(getUser(socket)._id).emit(`${name}_sync_request`)
        }
      } catch (err) {
        socket.emit(
          `${name}_sync_error`,
          typeof err === 'string' ? err : err.message,
          syncId
        )
      }
    }
  )
}

io.on('connection', (socket) => {
  socket.on('authorize', async (token: string, version: string) => {
    try {
      if (!token) {
        throw new Error('No token provided')
      }
      if (!version || +version < apiVersion) {
        throw new Error('Old API version, please, update the app')
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
    async (user, lastSyncDate: Date | undefined) => {
      const query = { user: user._id } as any
      if (lastSyncDate) {
        query.updatedAt = { $gt: lastSyncDate }
      }
      const usualTodos: Todo[] = await TodoModel.find(query)
        .populate('delegator')
        .populate('user')
      const delegatedTodosQuery = {
        user: { $exists: true },
        delegator: user._id,
      } as any
      if (lastSyncDate) {
        delegatedTodosQuery.updatedAt = { $gt: lastSyncDate }
      }
      const delegatedTodos: Todo[] = await TodoModel.find(delegatedTodosQuery)
        .populate('delegator')
        .populate('user')
      return [...usualTodos, ...delegatedTodos].map((todo) => todo.stripped())
    },
    async (todos, password) => {
      const savedTodos = await Promise.all(
        todos.map(
          (todo) =>
            new Promise<DocumentType<Todo>>(async (res, rej) => {
              try {
                if (!todo._id) {
                  const dbtodo = new TodoModel({
                    ...omit(todo, '_id'),
                    user: todo.user
                      ? (todo.user as DocumentType<User>)._id
                      : getUser(socket)._id,
                  })
                  if (!dbtodo.date) {
                    dbtodo.date = undefined
                  }
                  const savedTodo = (await dbtodo.save())
                    .populate('delegator')
                    .populate('user') as DocumentType<Todo>
                  await TodoModel.populate(savedTodo, [
                    { path: 'delegator' },
                    { path: 'user' },
                  ])
                  savedTodo._tempSyncId = todo._tempSyncId
                  res(savedTodo as any)
                } else {
                  const dbtodo = await TodoModel.findById(todo._id)
                    .populate('delegator')
                    .populate('user')
                  if (!dbtodo) {
                    return rej(new Error('Todo not found'))
                  }
                  if (
                    (dbtodo.user as DocumentType<User>)._id.toString() !==
                      getUser(socket)._id.toString() &&
                    (dbtodo.delegator as DocumentType<User>)._id.toString() !==
                      getUser(socket)._id.toString()
                  ) {
                    return rej(new Error('Not authorized'))
                  }
                  if (
                    dbtodo.delegateAccepted &&
                    getUser(socket)._id !==
                      (dbtodo.user as DocumentType<User>)._id
                  ) {
                    dbtodo._tempSyncId = todo._tempSyncId
                    todo = dbtodo
                    todo.updatedAt = new Date()
                  }
                  Object.assign(dbtodo, omit(todo, '_id'))
                  if (!dbtodo.date) {
                    dbtodo.date = undefined
                  }
                  const savedTodo = (await dbtodo.save())
                    .populate('delegator')
                    .populate('user') as DocumentType<Todo>
                  await TodoModel.populate(savedTodo, [
                    { path: 'delegator' },
                    { path: 'user' },
                  ])
                  savedTodo._tempSyncId = todo._tempSyncId
                  res(savedTodo as DocumentType<Todo>)
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
    async (user, lastSyncDate: Date | undefined) => {
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
            new Promise<DocumentType<Tag>>(async (res, rej) => {
              try {
                if (!tag._id) {
                  const dbtag = new TagModel({
                    ...omit(tag, '_id'),
                    user: getUser(socket)._id,
                  })
                  const savedTag = (await dbtag.save()) as DocumentType<Tag>
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
                  const savedTag = (await dbtag.save()) as DocumentType<Tag>
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
      if (
        settings.googleCalendarCredentials === undefined &&
        user.settings.googleCalendarCredentials
      ) {
        const api = getGoogleCalendarApi(
          user.settings.googleCalendarCredentials
        )
        try {
          await api.channels.stop({
            requestBody: {
              id: user._id,
              resourceId: user.googleCalendarResourceId,
            },
          })
        } catch (err) {
          report(err)
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
      const largest = dbhero.points > hero.points ? dbhero.points : hero.points
      dbhero.points = largest
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

  setupSync<{
    delegates: Partial<User>[]
    delegators: Partial<User>[]
    token: string
  }>(
    socket,
    'delegate',
    async (user) => {
      const dbuser = await UserModel.findById(user._id)
      if (!dbuser) {
        throw new Error('User not found')
      }
      const delegates = (
        await UserModel.findById(dbuser._id).populate('delegates')
      ).delegates.map((d: User) => d.stripped(false, false))
      const delegators = (
        await UserModel.find({ delegates: dbuser._id })
      ).map((d: User) => d.stripped(false, false))
      if (!dbuser.delegateInviteToken) {
        dbuser.delegateInviteToken = randToken.generate(16)
        await dbuser.save()
      }
      const token = dbuser.delegateInviteToken
      return {
        delegates,
        delegators,
        token,
      }
    },
    async (objects) => {
      return {
        objectsToPushBack: objects,
        needsSync: false,
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

function setUser(socket: SocketIO.Socket, user: DocumentType<User>) {
  ;(socket as any).user = user
}

function isAuthorized(socket: SocketIO.Socket) {
  return !!(socket as any).authorized
}

function getUser(socket: SocketIO.Socket): DocumentType<User> | undefined {
  return (socket as any).user
}

export function requestSync(userId: string) {
  io.to(userId).emit('todos_sync_request')
  io.to(userId).emit('tags_sync_request')
  io.to(userId).emit('settings_sync_request')
  io.to(userId).emit('user_sync_request')
}
