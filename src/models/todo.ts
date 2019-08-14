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

  @prop({
    required: true,
    index: true,
    minlength: 7,
    maxlength: 7,
    validate: [
      /^\d{2}-\d{4}$/,
      v => {
        const components = v.split('-')
        const date = +components[0]
        const year = +components[1]
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

  @instanceMethod
  stripped() {
    const stripFields = ['__v', 'user']
    return omit(this._doc, stripFields)
  }

  // Mongo property
  _doc: any
}

export const TodoModel = new Todo().getModelForClass(Todo, {
  schemaOptions: { timestamps: true },
})
