import { SubscriptionStatus, UserModel } from '@/models/user'
import { bot } from '@/helpers/report'

async function checkGoogleSubscribers() {
  if (process.env.DEBUG) {
    return
  }
  const monthAgo = new Date()
  monthAgo.setDate(monthAgo.getDate() - 30)
  const googleSubscribers = await UserModel.find({
    appleReceipt: { $exists: false },
    googleReceipt: { $exists: false },
    subscriptionId: { $exists: false },
    subscriptionStatus: 'trial',
    createdAt: { $lt: new Date().setDate(new Date().getDate() - 30) },
  })
  for (const googleSubscriber of googleSubscribers) {
    googleSubscriber.subscriptionStatus = SubscriptionStatus.inactive
    await googleSubscriber.save()
  }
  if (process.env.TELEGRAM_LOGIN_TOKEN) {
    await bot.telegram.sendMessage(
      76104711,
      `Non-apple subscription deactivated for ${googleSubscribers.length} users`
    )
  }
}

checkGoogleSubscribers()
// Check daily
setInterval(() => {
  checkGoogleSubscribers()
}, 24 * 60 * 60 * 1000)
