import { User } from '@models/user'
import { prop, Typegoose, instanceMethod, Ref } from 'typegoose'
import { omit } from 'lodash'

export class Hero extends Typegoose {
  @prop({ required: true, ref: User })
  user: Ref<User>
  @prop({ required: true, default: 0 })
  points: number

  @instanceMethod
  stripped() {
    const stripFields = ['__v', 'createdAt']
    return omit(this._doc, stripFields)
  }

  // Mongo property
  _doc: any
}

export const HeroModel = new Hero().getModelForClass(Hero, {
  schemaOptions: { timestamps: true },
})

export async function getOrCreateHero(userId: any) {
  let hero = await HeroModel.findOne({ user: userId })
  if (!hero) {
    hero = await new HeroModel({ user: userId }).save()
  }
  return hero
}
