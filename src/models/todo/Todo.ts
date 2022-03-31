import { Ref, prop } from '@typegoose/typegoose'
import { User } from '@/models/user/User'
import { omit, pick } from 'lodash'

export class Todo {
  @prop({ required: true, ref: User, index: true })
  user: Ref<User>

  @prop({ required: true })
  text: string
  @prop({ required: true, default: false, index: true })
  completed: boolean
  @prop({ required: true, default: false, index: true })
  frog: boolean
  @prop({ required: true, default: false, index: true })
  repetitive: boolean
  @prop({ required: true, default: 0 })
  frogFails: number
  @prop({ required: true, default: false, index: true })
  skipped: boolean

  @prop({ required: true, default: 0 })
  order: number
  @prop({ required: true, default: false })
  deleted: boolean
  @prop({ required: true, default: false })
  encrypted: boolean

  @prop({
    required: false,
    minlength: 16,
    maxlength: 16,
    validate: {
      validator(v) {
        if (!v) {
          return true
        } else {
          return /^[a-zA-Z0-9]{16}$/.test(v)
        }
      },
    },
  })
  clientId?: string

  @prop({
    required: function () {
      return !this.delegator
    },
    index: true,
    minlength: 7,
    maxlength: 7,
    validate: {
      validator(v) {
        if (v === null) {
          return true
        } else if (/^\d{4}-\d{2}$/.test(v)) {
          const components = v.split('-')
          const date = +components[1]
          const year = +components[0]
          return date <= 31 && date > 0 && year > 2018
        }
      },
    },
  })
  monthAndYear?: string // e.g. "08-2019" or "01-2020"
  @prop({
    index: true,
    minlength: 2,
    maxlength: 2,
    validate: {
      validator(v) {
        if (v === null) {
          return true
        }
        return v === undefined || (/^\d{2}$/.test(v) && +v <= 31 && +v > 0)
      },
    },
  })
  date?: string // e.g. "01" or "31"
  @prop({
    index: true,
    minlength: 5,
    maxlength: 5,
    validate: [(v) => !v || /^\d{2}:\d{2}$/.test(v)],
  })
  time?: string // e.g. "01:01"

  @prop({ ref: User, index: true })
  delegator?: Ref<User>
  @prop()
  delegateAccepted?: boolean

  stripped() {
    const stripFields = ['__v']
    const user = pick(this.user, ['name', '_id'])
    pick(this.delegator, ['name', '_id'])
    let delegator = pick(this.delegator, ['name', '_id'])
    if (!Object.keys(delegator).length) delegator = null
    return omit(
      { ...this._doc, ...{ _tempSyncId: this._tempSyncId, user, delegator } },
      stripFields
    ) as unknown as Todo
  }

  // Mongo property
  _doc: any
  _id: string
  updatedAt: Date
  // Temporary sync property
  _tempSyncId?: string
}

export function getTitle(todo: { monthAndYear?: string; date?: string }) {
  return `${todo.monthAndYear}${todo.date ? `-${todo.date}` : ''}`
}
