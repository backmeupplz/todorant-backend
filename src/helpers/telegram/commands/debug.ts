import { TagModel } from '../../../models/tag'
import { linkify } from '../../linkify'
import { UserModel } from '../../../models/user'
import { ContextMessageUpdate } from 'telegraf'
import { TodoModel } from '../../../models'

export async function sendDebug(ctx: ContextMessageUpdate) {
  if (ctx.from.id !== parseInt(process.env.ADMIN, 10)) {
    return
  }

  const users = await UserModel.find({})
  for (const user of users) {
    const todos = await TodoModel.find({ user: user._id })
    const hashtagMap = todos.reduce((prev, cur) => {
      const hashtagMatches = linkify.match(cur.text) || []
      for (const match of hashtagMatches) {
        if (/^#[\u0400-\u04FFa-zA-Z_0-9]+$/u.test(match.url)) {
          prev[match.url.substr(1)] = 1
        }
      }
      return prev
    }, {})
    const hashtags = Object.keys(hashtagMap)
    if (!hashtags.length) {
      continue
    }
    const hashtagsToCreate = hashtags.map(
      (hashtag) =>
        new TagModel({
          user: user._id,
          tag: hashtag,
        })
    )
    await TagModel.create(hashtagsToCreate)
    console.log(hashtags)
  }

  return ctx.reply('noice')
}
