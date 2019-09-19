import { User } from '../models'
import * as tt from '../../node_modules/telegraf/typings/telegram-types.d'
import { InstanceType } from 'typegoose'

declare module 'telegraf' {
  export class ContextMessageUpdate {
    public dbuser: InstanceType<User>
  }
}
