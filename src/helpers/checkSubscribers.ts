import { DocumentType } from '@typegoose/typegoose'
import { SubscriptionStatus, User, UserModel } from '@/models/user'
import { bot, report } from '@/helpers/report'
import { googleSubscriptionValidator } from '@/helpers/googleSubscriptionValidator'
import { requestSync } from '@/sockets/index'
import { stripe } from '@/helpers/stripe'
import { subscriptionVerifier } from '@/helpers/subscriptionVerifier'

async function checkSubscribers() {
  if (process.env.DEBUG || process.env.NODE_ENV === 'test') return
  const monthAgo = new Date()
  monthAgo.setDate(monthAgo.getDate() - 30)
  const subscribers = await UserModel.find({
    $and: [
      {
        $or: process.env.DEBUG
          ? [{ googleReceipt: { $exists: true } }]
          : [
              { subscriptionId: { $exists: true } },
              { appleReceipt: { $exists: true } },
              { googleReceipt: { $exists: true } },
            ],
      },
      {
        $or: [
          { isPerpetualLicense: false },
          { isPerpetualLicense: { $exists: false } },
        ],
      },
    ],
    subscriptionStatus: {
      $nin: [SubscriptionStatus.earlyAdopter, SubscriptionStatus.inactive],
    },
    createdAt: { $lt: monthAgo },
  })
  console.log(`Checking subscriptions for ${subscribers.length} subscribers`)
  let deactivatedSubscribers = 0
  for (const subscriber of subscribers) {
    let shouldBeDeactivated = true

    // Check Apple subscription
    if (!process.env.DEBUG) {
      if (subscriber.appleReceipt && (await checkAppleReceipt(subscriber))) {
        shouldBeDeactivated = false
      }
    }
    // Check Google subscription
    if (subscriber.googleReceipt && (await checkGoogleReceipt(subscriber))) {
      shouldBeDeactivated = false
    }
    // Check Stipe subscription
    if (!process.env.DEBUG) {
      if (subscriber.subscriptionId && (await checkStripeReceipt(subscriber))) {
        shouldBeDeactivated = false
      }
    }

    if (shouldBeDeactivated) {
      subscriber.subscriptionStatus = SubscriptionStatus.inactive
      await subscriber.save()
      requestSync(subscriber._id)
      deactivatedSubscribers++
    }
  }
  if (process.env.TELEGRAM_LOGIN_TOKEN) {
    await bot.telegram.sendMessage(
      76104711,
      `Subscription deactivated for ${deactivatedSubscribers} users out of ${subscribers.length} subscribers`
    )
  }
}

async function checkAppleReceipt(subscriber: DocumentType<User>) {
  try {
    const receipt = subscriber.appleReceipt
    if (!receipt) {
      return false
    }
    const response = await subscriptionVerifier.validateApple(receipt)
    const latestReceipt = response.latest_receipt
    const latestReceiptInfo = response.latest_receipt_info
    // Get latest
    let latestSubscription = 0
    for (const info of latestReceiptInfo) {
      if (+info.expires_date_ms > latestSubscription) {
        latestSubscription = +info.expires_date_ms
      }
    }
    // Save receipt
    subscriber.appleReceipt = latestReceipt
    await subscriber.save()
    // Check status
    return new Date().getTime() < latestSubscription
  } catch (err) {
    report(err)
    return false
  }
}

async function checkGoogleReceipt(subscriber: User) {
  try {
    const receipt = subscriber.googleReceipt
    if (!receipt) {
      return false
    }
    const productIds = [
      'todorant.monthly',
      'todorant.yearly',
      'todorant.yearly.36',
    ]
    for (const productId of productIds) {
      try {
        const subscription = await googleSubscriptionValidator.verifySub({
          packageName: 'com.todorant',
          productId,
          purchaseToken: receipt,
        })
        if (+subscription.payload.expiryTimeMillis > Date.now()) {
          return true
        }
      } catch {
        // Do nothing
      }
    }
    return false
  } catch (err) {
    report(err)
    return false
  }
}

async function checkStripeReceipt(subscriber: User) {
  try {
    const receipt = subscriber.subscriptionId as string
    if (!receipt) {
      return false
    }
    const subscription = await stripe.subscriptions.retrieve(receipt)
    return ['active', 'incomplete', 'past_due'].includes(subscription.status)
  } catch (err) {
    report(err)
    return false
  }
}

checkSubscribers()
// Check daily
setInterval(() => {
  checkSubscribers()
}, 24 * 60 * 60 * 1000)
