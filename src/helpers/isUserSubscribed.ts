import { SubscriptionStatus, User } from '@/models/user/User'
import { daysBetween } from '@/helpers/daysBetween'

export function isUserSubscribed(user: User) {
  return !(
    user.subscriptionStatus === SubscriptionStatus.inactive ||
    (user.subscriptionStatus === SubscriptionStatus.trial &&
      daysBetween(new Date(user._doc.createdAt), new Date()) > 30)
  )
}
