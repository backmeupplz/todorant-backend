import * as SocketIO from 'socket.io'
import { DocumentType } from '@typegoose/typegoose'
import { User } from '@/models/user'

export function setupSync<T>(
  socket: SocketIO.Socket,
  name: string,
  getObjects: (
    user: DocumentType<User>,
    lastSyncDate: Date | undefined
  ) => Promise<T>,
  onPushObjects: (
    objects: T,
    password?: string
  ) => Promise<{ objectsToPushBack: T; needsSync: boolean }>
) {
  socket.on(
    `sync_${name}`,
    async (lastSyncDate: Date | undefined, syncId: string) => {
      try {
        const user = socket.user
        if (!socket.authorized || !user) {
          socket.emit(`${name}_sync_error`, 'Not authorized', syncId)
          return
        }
        socket.emit(name, await getObjects(user, lastSyncDate), syncId)
      } catch (err) {
        socket.emit(
          `${name}_sync_error`,
          typeof err === 'string' ? err : err.message,
          syncId
        )
      }
    }
  )
  socket.on(
    `push_${name}`,
    async (syncId: string, objects: T, password?: string) => {
      try {
        const { objectsToPushBack, needsSync } = await onPushObjects(
          objects,
          password
        )
        socket.emit(`${name}_pushed`, objectsToPushBack, syncId)
        if (needsSync) {
          socket.broadcast.to(socket.user._id).emit(`${name}_sync_request`)
        }
      } catch (err) {
        socket.emit(
          `${name}_sync_error`,
          typeof err === 'string' ? err : err.message,
          syncId
        )
      }
    }
  )
}
