import { User } from '../models/user'
import { DocumentType } from '@typegoose/typegoose'
import I18N from 'telegraf-i18n'

declare module 'telegraf' {
  export class Context {
    public dbuser: DocumentType<User>
    i18n: I18N
  }
}
