import { report } from '@/helpers/report'
import { Context } from 'telegraf'
import { urlToText } from '@/helpers/telegram/helpers/urlToText'
import { addTodoWithText } from '@/helpers/telegram/commands/todo'
import { languageForCode } from '@/helpers/telegram/helpers/witLanguage'
import { capitalizeSentence } from '@/helpers/capitalizeSentence'

export async function handleMessage(ctx: Context) {
  try {
    // Get wit language
    const witLanguage = languageForCode(ctx.dbuser.telegramLanguage)
    // Get message
    const message = ctx.message
    // Get voice message
    const voice = message.voice
    if (voice.file_size && voice.file_size >= 19 * 1024 * 1024) {
      return await sendLargeFileError(ctx, message)
    }
    const voiceUrl = await ctx.telegram.getFileLink(voice.file_id)
    try {
      await sendTranscription(ctx, voiceUrl, witLanguage)
    } catch (err) {
      report(err.message)
    }
  } catch (err) {
    report(err.message)
  }
}

async function sendTranscription(ctx, url, witLanguage) {
  // Get message
  const message = ctx.message
  const sentMessage = await sendVoiceRecognitionMessage(ctx, message)
  try {
    // Convert url to text
    const textArr = await urlToText(url, witLanguage)
    const text =
      textArr.length > 1 ? textArr.map((t) => `${t}`).join(' ') : `${textArr}`

    await addTodoWithText(capitalizeSentence(text), ctx, sentMessage, true)
  } catch (err) {
    // In case of error, send it
    await updateMessagewithError(ctx, sentMessage)
    report(err.message)
  }
}

async function updateMessagewithError(ctx, msg) {
  try {
    // Get text
    let text = ctx.i18n.t('error')

    // Edit message
    await ctx.telegram.editMessageText(
      msg.chat.id,
      msg.message_id,
      null,
      text,
      {
        parse_mode: 'Markdown',
      }
    )
  } catch (err) {
    report(err.message)
  }
}

function sendVoiceRecognitionMessage(ctx, message) {
  return ctx.replyWithMarkdown(ctx.i18n.t('initiated'), {
    reply_to_message_id: message.message_id,
  })
}

function sendLargeFileError(ctx, message) {
  return ctx.replyWithMarkdown(ctx.i18n.t('error_twenty'), {
    parse_mode: 'Markdown',
    reply_to_message_id: message.message_id,
  })
}
