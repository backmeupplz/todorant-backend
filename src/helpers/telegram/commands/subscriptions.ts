import { Context } from 'telegraf'
import { SubscriptionStatus, UserModel } from '@/models/user'

export async function sendSubscriptions(ctx: Context) {
  const subscribersCount = await UserModel.count({
    $or: [
      { subscriptionId: { $exists: true } },
      { appleReceipt: { $exists: true } },
      { googleReceipt: { $exists: true } },
    ],
    subscriptionStatus: SubscriptionStatus.active,
  })
  const perpetualUsersCount = await UserModel.count({
    isPerpetualLicense: true,
    subscriptionStatus: SubscriptionStatus.active,
  })
  return ctx.reply(
    `Number of subscribers: ${subscribersCount}, number of perpetual licences: ${perpetualUsersCount}`
  )
}
