import { User } from '../models'
import * as tt from '../../node_modules/telegraf/typings/telegram-types.d'
import { InstanceType } from 'typegoose'
import I18N from 'telegraf-i18n'

declare module 'telegraf' {
  export class ContextMessageUpdate {
    public dbuser: InstanceType<User>
    i18n: I18N
  }
}
