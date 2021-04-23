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
                  res(savedTodo)
                } else {
                  const dbtodo = await TodoModel.findById(todo._id)
                    .populate('delegator')
                    .populate('user')
                  if (!dbtodo) {
                    return rej(new Error('Todo not found'))
                  }
                  // Reject if not a user of todo or delegator
                  if (
                    (dbtodo.user as DocumentType<User>)._id.toString() !==
                      getUser(socket)._id.toString() &&
                    (dbtodo.delegator as DocumentType<User>)._id.toString() !==
                      getUser(socket)._id.toString()
                  ) {
                    return rej(new Error('Not authorized'))
                  }
                  // Prevent changing accepted tasks by delegators
                  if (
                    dbtodo.delegateAccepted &&
                    getUser(socket)._id.toString() !==
                      (dbtodo.user as DocumentType<User>)._id.toString()
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
          'isPerpetualLicense',
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
    delegates: Partial<User & { deleted: boolean }>[]
    delegators: Partial<User & { deleted: boolean }>[]
    token: string
  }>(
    socket,
    'delegate',
    async (user, lastSyncDate: Date | undefined) => {
      const dbuser = await UserModel.findById(user._id).populate('delegates')
      if (!dbuser) {
        throw new Error('User not found')
      }
      const token = dbuser.delegateInviteToken
      const dbUserDelegators = await UserModel.find({ delegates: dbuser._id })
      const dbUserDelegates = dbuser.delegates as DocumentType<User>[]
      let delegates: strippedDelegationUser[] | undefined
      let delegators: strippedDelegationUser[] | undefined

      let delegateUpdated: boolean
      if (lastSyncDate) {
        // Get date object from string
        lastSyncDate = new Date(lastSyncDate)
      }
      if (lastSyncDate && dbuser.delegatesUpdatedAt < lastSyncDate) {
        // Get delegates
        delegates = dbUserDelegates
          .filter((delegate) => delegate.updatedAt > lastSyncDate)
          .map((delegate) => delegate.stripped(false) as strippedDelegationUser)
        // Get delegators
        delegators = dbUserDelegators
          .filter((delegator) => delegator.updatedAt > lastSyncDate)
          .map(
            (delegator) => delegator.stripped(false) as strippedDelegationUser
          )
      } else {
        delegateUpdated = true
        delegates = dbUserDelegates.map(
          (delegate) => delegate.stripped(false) as strippedDelegationUser
        )
        delegators = dbUserDelegators.map(
          (delegate) => delegate.stripped(false) as strippedDelegationUser
        )
      }
      return {
        delegators,
        delegates,
        token,
        delegateUpdated,
      } as any
    },
    async (objects) => {
      await Promise.all(
        objects.delegators.map(async (delegator, index) => {
          if (!delegator._id && delegator.delegateInviteToken) {
            const dbDelegator = await UserModel.findOne({
              delegateInviteToken: delegator.delegateInviteToken,
            })
            dbDelegator.delegates.push(getUser(socket)._id)
            objects.delegators[index] = Object.assign(
              delegator,
              dbDelegator.stripped()
            )
            dbDelegator.save()
          }
        })
      )

      const delegatorsToRemove = objects.delegators.filter(
        (delegator) => delegator.deleted
      )
      const delegatesToRemove = objects.delegates.filter(
        (delegate) => delegate.deleted
      )
      // Remove delegators
      Promise.all(
        delegatorsToRemove.map(async (delegator) => {
          await UserModel.updateOne(
            { _id: delegator._id },
            { $pull: { delegates: getUser(socket)._id } }
          )
        })
      )
      // Remove delegates
      await UserModel.updateOne(
        { _id: getUser(socket)._id },
        {
          $pullAll: {
            delegates: delegatesToRemove.map((delegate) => delegate._id),
          },
        }
      )
      return {
        objectsToPushBack: objects,
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
  io.to(userId).emit('delegate_sync_request')
}

type strippedDelegationUser = Pick<
  User,
  'name' | 'delegateInviteToken' | '_id' | 'updatedAt'
>
