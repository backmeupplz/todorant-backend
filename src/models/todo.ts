// Dependencies
import { prop, Typegoose, instanceMethod, Ref } from 'typegoose'
import { omit } from 'lodash'
import { User } from './user'

export class Todo extends Typegoose {
  @prop({ required: true, ref: User })
  user: Ref<User>

  @prop({ required: true })
  text: string
  @prop({ required: true, default: false, index: true })
  completed: boolean
  @prop({ required: true, default: false, index: true })
  frog: boolean
  @prop({ required: true, default: 0 })
  frogFails: number
  @prop({ required: true, default: false, index: true })
  skipped: boolean

  @prop({ required: true, default: 0 })
  order: number
  @prop({ required: true, default: false })
  deleted: boolean

  @prop({
    required: true,
    index: true,
    minlength: 7,
    maxlength: 7,
    validate: [
      /^\d{4}-\d{2}$/,
      v => {
        const components = v.split('-')
        const date = +components[1]
        const year = +components[0]
        return date <= 31 && date > 0 && year > 2018
      },
    ],
  })
  monthAndYear: string // e.g. "08-2019" or "01-2020"
  @prop({
    index: true,
    minlength: 2,
    maxlength: 2,
    validate: [/^\d{2}$/, v => +v <= 31 && +v > 0],
  })
  date?: string // e.g. "01" or "31"
  @prop({
    index: true,
    minlength: 5,
    maxlength: 5,
    validate: [v => !v || /^\d{2}:\d{2}$/.test(v)],
  })
  time?: string // e.g. "01:01"

  @instanceMethod
  stripped() {
    const stripFields = ['__v', 'user']
    return omit(this._doc, stripFields) as Todo
  }

  // Mongo property
  _doc: any
  _id: string
  // Temporary sync property
  _tempSyncId?: string
}

export const TodoModel = new Todo().getModelForClass(Todo, {
  schemaOptions: { timestamps: true },
})
