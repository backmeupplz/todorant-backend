import { ContextMessageUpdate } from 'telegraf'
import { handleMessage } from './voice'

export function handleVoice(ctx: ContextMessageUpdate) {
  // Handle voice
  handleMessage(ctx)
}
