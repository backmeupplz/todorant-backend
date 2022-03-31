import { Ref, getModelForClass, prop } from '@typegoose/typegoose'
import { User } from '@/models/user'
import { omit } from 'lodash'

export class Hero {
  @prop({ required: true, ref: User })
  user: Ref<User>
  @prop({ required: true, default: 0 })
  points: number

  stripped() {
    const stripFields = ['__v', 'createdAt']
    return omit(this._doc, stripFields)
  }

  // Mongo property
  _doc: any
}

export const HeroModel = getModelForClass(Hero, {
  schemaOptions: { timestamps: true },
})

export async function getOrCreateHero(userId: any) {
  let hero = await HeroModel.findOne({ user: userId })
  if (!hero) {
    hero = await new HeroModel({ user: userId }).save()
  }
  return hero
}
