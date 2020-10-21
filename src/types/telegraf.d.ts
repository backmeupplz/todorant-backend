import { User } from '../models/user'
import { InstanceType } from 'typegoose'
import I18N from 'telegraf-i18n'

declare module 'telegraf' {
  export class ContextMessageUpdate {
    public dbuser: InstanceType<User>
    i18n: I18N
  }
}
