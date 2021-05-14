import { getModelForClass, index, prop } from '@typegoose/typegoose'

@index({ createdAt: 1 }, { expireAfterSeconds: 600 })
export class QrLogin {
  @prop({ index: true })
  token?: string

  @prop({ required: true, unique: true, index: true })
  uuid: string
}

export const QrLoginModel = getModelForClass(QrLogin, {
  schemaOptions: { timestamps: true },
})
