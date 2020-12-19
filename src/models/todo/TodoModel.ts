import { Todo } from '@/models/todo/Todo'
import { getModelForClass } from '@typegoose/typegoose'

export const TodoModel = getModelForClass(Todo, {
  schemaOptions: { timestamps: true },
})
