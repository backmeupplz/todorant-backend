import { ContextMessageUpdate } from 'telegraf'
import { handleMessage } from '@helpers/telegram/helpers/voice'

export function handleVoice(ctx: ContextMessageUpdate) {
  // Handle voice
  handleMessage(ctx)
}
