import { prop, Ref, getModelForClass } from '@typegoose/typegoose'
import { omit } from 'lodash'
import { User, UserModel } from '@models/user'

export class Report {
  @prop({ required: true, index: true, unique: true })
  uuid: string

  @prop({ required: true, ref: User })
  user: Ref<User>
  @prop({ required: true })
  meta: object
  @prop()
  hash?: string

  async strippedAndFilled() {
    const stripFields = ['__v', 'user']
    const result = omit(this._doc, stripFields) as any
    const user = await UserModel.findById(this.user)
    result.user = user.name
    return result
  }

  // Mongo property
  _doc: any
}

export const ReportModel = getModelForClass(Report, {
  schemaOptions: { timestamps: true },
})
