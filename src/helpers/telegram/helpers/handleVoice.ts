import { Context } from 'telegraf'
import { handleMessage } from '@helpers/telegram/helpers/voice'

export function handleVoice(ctx: Context) {
  // Handle voice
  handleMessage(ctx)
}
