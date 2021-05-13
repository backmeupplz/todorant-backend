import { getModelForClass, index, prop } from '@typegoose/typegoose'

@index({ token: 1 })
@index({ uuid: 1 })
@index({ createdAt: 1 }, { expireAfterSeconds: 600 })
export class QrLogin {
  @prop()
  token?: string

  @prop({ required: true, unique: true })
  uuid: string

  // Mongo property
  _doc: any
}

export const QrLoginModel = getModelForClass(QrLogin, {
  schemaOptions: { timestamps: true },
})
