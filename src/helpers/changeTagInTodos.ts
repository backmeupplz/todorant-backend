import { TodoModel } from '@models/todo'

export async function changeTagInTodos(
  originalTag: string,
  newTag: string,
  userId: string
) {
  const todosWithTag = await TodoModel.find({
    user: userId,
    text: { $regex: originalTag, $options: 'i' },
  })
  todosWithTag.forEach(async (todo) => {
    todo.text = todo.text
      .split(' ')
      .map((word) => {
        if (word !== originalTag) return word
        return `#${newTag}`
      })
      .join(' ')
    todo.markModified('text')
    await todo.save()
  })
}
