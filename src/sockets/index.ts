import { DocumentType, Ref } from '@typegoose/typegoose'
import { FilterQuery } from 'mongoose'
import { Hero, HeroModel, getOrCreateHero } from '@/models/hero'
import { Settings, User, UserModel } from '@/models/user'
import { Tag, TagModel, createWMDBTag, updateWMDBTag } from '@/models/tag'
import { Todo, TodoModel, createWMDBTodo, updateWMDBTodo } from '@/models/todo'
import {
  WMDBChanges,
  WMDBTables,
  WMDBTag,
  WMDBTodo,
  convertModelToRawSql,
} from '@/helpers/wmdb'
import { getGoogleCalendarApi, updateTodos } from '@/helpers/googleCalendar'
import { io } from '@/sockets/io'
import { omit } from 'lodash'
import { report } from '@/helpers/report'
import { setupAuthorization } from '@/sockets/setupAuthorization'
import { setupSync } from '@/sockets/setupSync'

type UserWithDeleted = User & { deleted: boolean }

async function getUpdatedOrCreatedItems(
  lastPullTimestamp: Date | undefined,
  userId: string,
  model: typeof TodoModel | typeof TagModel,
  delegator = false
) {
  const query = {} as FilterQuery<typeof model>
  if (delegator) {
    query.$or = [{ delegator: userId }, { user: userId }]
  } else {
    query.user = userId
  }
  if (lastPullTimestamp) {
    query.updatedAt = { $gt: lastPullTimestamp }
  } else {
    query.deleted = false
  }
  return (await model.find(query).populate('user').populate('delegator')).map(
    (todoOrTag) => {
      return todoOrTag.stripped()
    }
  )
}

io.on('connection', (socket) => {
  setupAuthorization(socket)

  socket.on('get_wmdb', async (lastSyncDate: Date | undefined) => {
    try {
      const syncedAt = Date.now()
      const userId = socket.user._id
      const updatedTags = await getUpdatedOrCreatedItems(
        lastSyncDate,
        userId,
        TagModel
      )
      const updatedTodos = await getUpdatedOrCreatedItems(
        lastSyncDate,
        userId,
        TodoModel,
        true
      )
      const wmdbSyncObject = {
        [WMDBTables.Todo]: convertModelToRawSql<WMDBTodo>(updatedTodos),
        [WMDBTables.Tag]: convertModelToRawSql<WMDBTag>(updatedTags),
      }
      socket.emit('return_wmdb', wmdbSyncObject, syncedAt)
    } catch (err) {
      console.log(err)
      socket.emit(
        `wmdb_sync_error`,
        typeof err === 'string' ? err : err.message
      )
    }
  })

  socket.on(
    'push_wmdb',
    async (
      changes: WMDBChanges,
      lastPulledTimestamp: number,
      password?: string
    ) => {
      const savedTodos = [] as Todo[]
      try {
        const userId = socket.user._id
        const toPushBack = { todos: [] as Todo[], tags: [] as Tag[] }
        const usersForSync = new Set<Ref<User, string>>([userId])
        await Promise.all([
          ...changes.todos.created.map(async (sqlRaw) => {
            await createWMDBTodo(
              sqlRaw,
              socket.user,
              toPushBack.todos,
              usersForSync,
              savedTodos
            )
          }),
          ...changes.todos.updated.map(async (sqlRaw) => {
            await updateWMDBTodo(
              sqlRaw,
              socket.user,
              toPushBack.todos,
              usersForSync,
              savedTodos
            )
          }),
          ...changes.tags.created.map(async (sqlRaw) => {
            await createWMDBTag(sqlRaw, socket.user, toPushBack.tags)
          }),
          ...changes.tags.updated.map(async (sqlRaw) => {
            await updateWMDBTag(sqlRaw, socket.user, toPushBack.tags)
          }),
        ])
        usersForSync.forEach((user) => {
          requestSync(user.toString())
        })
        socket.emit('complete_wmdb', toPushBack)
        // Update calendar
        updateTodos(
          savedTodos,
          socket.user.settings.googleCalendarCredentials,
          password,
          socket.user.settings.removeCompletedFromCalendar
        )
      } catch (err) {
        console.log(err)
        socket.emit(
          `wmdb_sync_error`,
          typeof err === 'string' ? err : err.message
        )
      }
    }
  )

  setupSync<Todo[]>(
    socket,
    'todos',
    async (user, lastSyncDate: Date | undefined) => {
      const query = { user: user._id } as FilterQuery<Todo>
      if (lastSyncDate) {
        query.updatedAt = { $gt: lastSyncDate }
      }
      const usualTodos: Todo[] = await TodoModel.find(query)
        .populate('delegator')
        .populate('user')
      const delegatedTodosQuery = {
        user: { $exists: true },
        delegator: user._id,
      } as FilterQuery<Todo>
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
                      : socket.user._id,
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
                  if (savedTodo.delegator) {
                    requestSync(
                      (savedTodo.user as DocumentType<User>)._id.toString()
                    )
                  }
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
                      socket.user._id.toString() &&
                    (dbtodo.delegator as DocumentType<User>)._id.toString() !==
                      socket.user._id.toString()
                  ) {
                    return rej(new Error('Not authorized'))
                  }
                  // Prevent changing accepted tasks by delegators
                  const isChangesFromDelegator =
                    socket.user._id.toString() !==
                    (dbtodo.user as DocumentType<User>)._id.toString()
                  if (dbtodo.delegateAccepted && isChangesFromDelegator) {
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
                  if (savedTodo.delegator) {
                    if (isChangesFromDelegator) {
                      requestSync(
                        (savedTodo.user as DocumentType<User>)._id.toString()
                      )
                    } else {
                      requestSync(
                        (
                          savedTodo.delegator as DocumentType<User>
                        )._id.toString()
                      )
                    }
                  }
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
        socket.user.settings.googleCalendarCredentials,
        password,
        socket.user.settings.removeCompletedFromCalendar
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
      const query = { user: user._id } as FilterQuery<Tag>
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
                    user: socket.user._id,
                  })
                  const savedTag = (await dbtag.save()) as DocumentType<Tag>
                  savedTag._tempSyncId = tag._tempSyncId
                  res(savedTag as any)
                } else {
                  const dbtag = await TagModel.findById(tag._id)
                  if (!dbtag) {
                    return rej(new Error('Tag not found'))
                  }
                  if (dbtag.user.toString() !== socket.user._id.toString()) {
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
      // Find user
      const user = await UserModel.findById(socket.user._id)
      if (!user) {
        throw new Error('User not found')
      }
      // Check google calendar
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
      // Merge settings and update updated at
      user.settings = {
        ...(user.settings || {}),
        ...settings,
        updatedAt: new Date(),
      }
      // Save user
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
      const dbhero = await HeroModel.findOne({ user: socket.user._id })
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
      const dbuser = await UserModel.findById(socket.user._id)
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
    delegates: Partial<UserWithDeleted>[]
    delegators: (Partial<UserWithDeleted> & { invalid: boolean })[]
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
      let delegates: StrippedDelegationUser[] | undefined
      let delegators: StrippedDelegationUser[] | undefined

      let delegateUpdated: boolean
      if (lastSyncDate) {
        // Get date object from string
        lastSyncDate = new Date(lastSyncDate)
      }
      if (lastSyncDate && dbuser.delegatesUpdatedAt < lastSyncDate) {
        // Get delegates
        delegates = dbUserDelegates
          .filter((delegate) => delegate.updatedAt > lastSyncDate)
          .map((delegate) => delegate.stripped(false) as StrippedDelegationUser)
        // Get delegators
        delegators = dbUserDelegators
          .filter((delegator) => delegator.updatedAt > lastSyncDate)
          .map(
            (delegator) => delegator.stripped(false) as StrippedDelegationUser
          )
      } else {
        delegateUpdated = true
        delegates = dbUserDelegates.map(
          (delegate) => delegate.stripped(false) as StrippedDelegationUser
        )
        delegators = dbUserDelegators.map(
          (delegate) => delegate.stripped(false) as StrippedDelegationUser
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
            if (
              !dbDelegator ||
              dbDelegator._id.toString() === socket.user._id.toString()
            ) {
              delegator.invalid = true
            } else {
              dbDelegator.delegates.push(socket.user._id)
              objects.delegators[index] = Object.assign(
                delegator,
                dbDelegator.stripped()
              )
              await dbDelegator.save()
              requestSync(dbDelegator._id)
            }
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
      await Promise.all(
        delegatorsToRemove.map(async (delegator) => {
          await UserModel.updateOne(
            { _id: delegator._id },
            { $pull: { delegates: socket.user._id } }
          )
          requestSync(delegator._id)
        })
      )
      const delegatesIds = delegatesToRemove.map((delegate) => delegate._id)
      // Remove delegates
      await UserModel.updateOne(
        { _id: socket.user._id },
        {
          $pullAll: {
            delegates: delegatesIds,
          },
        }
      )
      delegatesIds.forEach((delegateId) => {
        requestSync(delegateId)
      })
      return {
        objectsToPushBack: objects,
        needsSync: true,
      }
    }
  )
})

export function requestSync(userId: string) {
  io.to(userId).emit('todos_sync_request')
  io.to(userId).emit('tags_sync_request')
  io.to(userId).emit('settings_sync_request')
  io.to(userId).emit('user_sync_request')
  io.to(userId).emit('delegate_sync_request')
  io.to(userId).emit('wmdb')
}

type StrippedDelegationUser = Pick<
  User,
  'name' | 'delegateInviteToken' | '_id' | 'updatedAt'
>
