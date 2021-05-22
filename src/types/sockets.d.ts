import { DocumentType } from '@typegoose/typegoose'
import { User } from '../models/user'

declare global {
  namespace SocketIO {
    export interface Socket {
      authorized?: boolean
      user?: DocumentType<User>
    }
  }
}
