import { TodoModel } from '@models/todo'

// $text: { $search: { originalTag } },

export async function changeTagInTodos(
  originalTag: string,
  newTag: string,
  userId: string
) {
  const todosWithTag = await TodoModel.find({
    user: userId,
    text: { $regex: originalTag, $options: 'i' },
  })
  todosWithTag.forEach((todo) => {
    todo.text = todo.text.replace(originalTag, `#${newTag}`)
    todo.markModified('text')
    todo.save()
  })
}
