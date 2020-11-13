import { SubscriptionStatus, UserModel } from '@/models/user'
import axios from 'axios'
import { bot } from '@/helpers/report'

async function checkAppleSubscribers() {
  if (process.env.DEBUG) {
    return
  }
  const appleSubscribers = await UserModel.find({
    appleReceipt: { $exists: true },
    subscriptionStatus: { $ne: 'earlyAdopter' },
  })
  let numberOfDeactivatedSubscribers = 0
  for (const appleSubscriber of appleSubscribers) {
    const receipt = appleSubscriber.appleReceipt
    if (!receipt) {
      continue
    }
    const appleUrl = 'https://buy.itunes.apple.com/verifyReceipt'
    const password = process.env.APPLE_SECRET
    const response = await axios.post(appleUrl, {
      'receipt-data': receipt,
      password,
    })
    const latestReceipt = response.data.latest_receipt
    const latestReceiptInfo = response.data.latest_receipt_info
    // Get latest
    let latestSubscription = 0
    for (const info of latestReceiptInfo) {
      if (+info.expires_date_ms > latestSubscription) {
        latestSubscription = +info.expires_date_ms
      }
    }
    // Check status
    const subscriptionIsActive = new Date().getTime() < latestSubscription
    if (subscriptionIsActive) {
      appleSubscriber.subscriptionStatus = SubscriptionStatus.active
    } else {
      if (appleSubscriber.subscriptionStatus !== SubscriptionStatus.inactive) {
        numberOfDeactivatedSubscribers++
      }
      appleSubscriber.subscriptionStatus = SubscriptionStatus.inactive
    }
    appleSubscriber.appleReceipt = latestReceipt
    await appleSubscriber.save()
  }
  if (process.env.TELEGRAM_LOGIN_TOKEN) {
    await bot.telegram.sendMessage(
      76104711,
      `Apple subscription deactivated for ${numberOfDeactivatedSubscribers} users`
    )
  }
}

checkAppleSubscribers()
// Check daily
setInterval(() => {
  checkAppleSubscribers()
}, 24 * 60 * 60 * 1000)
