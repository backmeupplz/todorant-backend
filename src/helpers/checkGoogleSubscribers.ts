import { SubscriptionStatus, UserModel } from '@models/user'
import { bot } from '@helpers/report'

async function checkGoogleSubscribers() {
  if (process.env.DEBUG) {
    return
  }
  console.log('Checking non-apple subscribers...')
  const monthAgo = new Date()
  monthAgo.setDate(monthAgo.getDate() - 30)
  const googleSubscribers = await UserModel.find({
    appleReceipt: { $exists: false },
    googleReceipt: { $exists: false },
    subscriptionId: { $exists: false },
    subscriptionStatus: 'trial',
    createdAt: { $lt: new Date().setDate(new Date().getDate() - 30) },
  })
  console.log(`Got ${googleSubscribers.length} non-apple subscribers to check`)
  for (const googleSubscriber of googleSubscribers) {
    googleSubscriber.subscriptionStatus = SubscriptionStatus.inactive
    await googleSubscriber.save()
  }
  await bot.telegram.sendMessage(
    76104711,
    `Non-apple subscription deactivated for ${googleSubscribers.length} users`
  )
  console.log(
    `Non-apple subscription deactivated for ${googleSubscribers.length} users`
  )
  console.log('Finished checking non-apple subscribers')
}

checkGoogleSubscribers()
// Check daily
setInterval(() => {
  checkGoogleSubscribers()
}, 24 * 60 * 60 * 1000)
