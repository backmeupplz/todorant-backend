import { requestSync } from '@/sockets/index'
import { SubscriptionStatus, UserModel } from '@/models/user'
import { bot } from '@/helpers/report'

async function checkTrials() {
  if (process.env.DEBUG) {
    return
  }
  console.log('Checking trials')
  const monthAgo = new Date()
  monthAgo.setDate(monthAgo.getDate() - 30)
  const nonSubscribers = await UserModel.find({
    subscriptionId: { $exists: false },
    appleReceipt: { $exists: false },
    googleReceipt: { $exists: false },
    subscriptionStatus: {
      $nin: [SubscriptionStatus.earlyAdopter, SubscriptionStatus.inactive],
    },
    isPerpetualLicense: false,
    createdAt: { $lt: monthAgo },
  })
  for (const nonSubscriber of nonSubscribers) {
    nonSubscriber.subscriptionStatus = SubscriptionStatus.inactive
    await nonSubscriber.save()
    requestSync(nonSubscriber._id)
  }
  if (process.env.TELEGRAM_LOGIN_TOKEN) {
    await bot.telegram.sendMessage(
      76104711,
      `Non-subscriber trial deactivated for ${nonSubscribers.length} users`
    )
  }
  console.log('Finished checking trials')
}

checkTrials()
// Check daily
setInterval(() => {
  checkTrials()
}, 24 * 60 * 60 * 1000)
