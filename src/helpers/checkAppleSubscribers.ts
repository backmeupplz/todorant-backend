import { SubscriptionStatus } from './../models/user'
import { UserModel } from '../models/user'
import axios from 'axios'
import { bot } from './report'

async function checkAppleSubscribers() {
  if (process.env.DEBUG) {
    return
  }
  console.log('Checking apple subscribers...')
  const appleSubscribers = await UserModel.find({
    appleReceipt: { $exists: true },
    subscriptionStatus: { $ne: 'earlyAdopter' },
  })
  console.log(`Got ${appleSubscribers.length} apple subscribers to check`)
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
        await bot.telegram.sendMessage(
          76104711,
          `Apple subscription deactivated for ${appleSubscriber._id.toString()}`
        )
      }
      appleSubscriber.subscriptionStatus = SubscriptionStatus.inactive
    }
    appleSubscriber.appleReceipt = latestReceipt
    console.log(
      `Checked apple sub for ${appleSubscriber._id.toString()}, expires ${new Date(
        +latestSubscription
      )}`
    )
  }
  console.log('Finished checking apple subscribers')
}

checkAppleSubscribers()
// Check daily
setInterval(() => {
  checkAppleSubscribers()
}, 24 * 60 * 60 * 1000)
