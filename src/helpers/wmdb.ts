import { Tag } from '@/models/tag'
import { Todo } from '@/models/todo'
import { User } from '@/models/user'

interface WMDBShared {
  id: string
  server_id?: string
  created_at: number
  updated_at: number
  is_deleted: boolean
}

type WMDBUser = {
  name: string
  is_delegator: boolean
  delegate_invite_token: string
} & WMDBShared

export type WMDBTodo = {
  exact_date_at: number
  text: string
  is_completed: boolean
  is_frog: boolean
  frog_fails: number
  future_skips: number
  is_skipped: boolean
  order: number
  month_and_year?: string
  is_encrypted: boolean
  date?: string
  time?: string
  is_repetitive: boolean

  user_id?: WMDBUser
  delegator_id?: WMDBUser
  is_delegate_accepted?: boolean
} & WMDBShared

export type WMDBTag = {
  tag: string
  color: string
  number_of_uses: number
  is_epic: boolean
  epic_goal: number
  is_epic_completed: boolean
  epic_points: number
  epic_order: number
  user_id?: WMDBUser
} & WMDBShared

const mongoKeysAsWMDBValues = {
  _exactDate: 'exact_date_at',
  _id: 'server_id',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  text: 'text',
  completed: 'is_completed',
  frog: 'is_frog',
  frogFails: 'frog_fails',
  futureSkips: 'future_skips',
  skipped: 'is_skipped',
  order: 'order',
  monthAndYear: 'month_and_year',
  deleted: 'is_deleted',
  encrypted: 'is_encrypted',
  date: 'date',
  time: 'time',
  user: 'user_id',
  delegator: 'delegator_id',
  delegateAccepted: 'is_delegate_accepted',
  _tempSyncId: 'id',
  tag: 'tag',
  color: 'color',
  numberOfUses: 'number_of_uses',
  epic: 'is_epic',
  epicGoal: 'epic_goal',
  epicCompleted: 'is_epic_completed',
  epicPoints: 'epic_points',
  epicOrder: 'epic_order',
  name: 'name',
  isDelegator: 'is_delegator',
  delegateInviteToken: 'delegate_invite_token',
  todoId: 'todo_id',
  repetitive: 'is_repetitive',
}

export enum WMDBTables {
  Todo = 'todos',
  Tag = 'tags',
  User = 'users',
}

enum WMDBSyncColumns {
  Updated = 'updated',
  Created = 'created',
  Deleted = 'deleted',
}

export interface WMDBChanges {
  [WMDBTables.Todo]: {
    [WMDBSyncColumns.Updated]: WMDBTodo[]
    [WMDBSyncColumns.Created]: WMDBTodo[]
  }
  [WMDBTables.Tag]: {
    [WMDBSyncColumns.Updated]: WMDBTag[]
    [WMDBSyncColumns.Created]: WMDBTag[]
  }
}

function convertMongoObjectToWMDB<T>(mongoObject: Tag | Todo) {
  const wmdbObj = {} as T
  for (const key in mongoObject) {
    wmdbObj[mongoKeysAsWMDBValues[key]] = mongoObject[key] ?? null
  }
  return wmdbObj
}

export function convertModelToRawSql<T>(updated: (Todo | Tag)[]) {
  return {
    [WMDBSyncColumns.Created]: [] as const,
    [WMDBSyncColumns.Updated]: updated.map((_, index) => {
      return convertMongoObjectToWMDB<T>(updated[index])
    }),
    [WMDBSyncColumns.Deleted]: [] as const,
  }
}

export function fromSqlToObject(
  sqlObj: WMDBTodo | WMDBTag | WMDBUser,
  type: WMDBTables,
  user: string
) {
  let obj = {} as Todo | Tag | User
  if (type === WMDBTables.Todo) {
    sqlObj = sqlObj as WMDBTodo
    Object.assign(obj, {
      _tempSyncId: sqlObj.id,
      _exactDate: sqlObj.exact_date_at,
      _id: sqlObj.server_id,
      createdAt: sqlObj.created_at,
      updatedAt: sqlObj.updated_at,
      text: sqlObj.text,
      completed: sqlObj.is_completed,
      frog: sqlObj.is_frog,
      frogFails: sqlObj.frog_fails,
      futureSkips: sqlObj.future_skips,
      skipped: sqlObj.is_skipped,
      order: sqlObj.order,
      monthAndYear: sqlObj.month_and_year,
      deleted: sqlObj.is_deleted,
      encrypted: sqlObj.is_encrypted,
      date: sqlObj.date,
      time: sqlObj.time,
      user: sqlObj.user_id || user,
      delegator: sqlObj.delegator_id,
      delegateAccepted: sqlObj.is_delegate_accepted,
      repetitive: sqlObj.is_repetitive,
    })
  } else if (type === WMDBTables.Tag) {
    sqlObj = sqlObj as WMDBTag
    Object.assign(obj, {
      _tempSyncId: sqlObj.id,
      _id: sqlObj.server_id,
      user: sqlObj.user_id || user,
      deleted: sqlObj.is_deleted,
      tag: sqlObj.tag,
      color: sqlObj.color,
      epic: sqlObj.is_epic,
      epicCompleted: sqlObj.is_epic_completed,
      epicGoal: sqlObj.epic_goal,
      epicPoints: sqlObj.epic_points,
      epicOrder: sqlObj.epic_order,
      numberOfUses: sqlObj.number_of_uses,
      createdAt: sqlObj.created_at,
      updatedAt: sqlObj.updated_at,
    })
  } else {
    sqlObj = sqlObj as WMDBUser
    Object.assign(obj, {
      _tempSyncId: sqlObj.id,
      _id: sqlObj.server_id,
      deleted: sqlObj.is_deleted,
      createdAt: sqlObj.created_at,
      updatedAt: sqlObj.updated_at,
      delegateInviteToken: sqlObj.delegate_invite_token,
    })
  }
  return obj
}
