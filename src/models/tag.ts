// Dependencies
import { prop, Typegoose, instanceMethod, Ref, InstanceType } from 'typegoose'
import { omit } from 'lodash'
import { User } from './user'

export class Tag extends Typegoose {
  @prop({ required: true, ref: User })
  user: Ref<User>
  @prop({ required: true, default: false })
  deleted: boolean

  @prop({ required: true })
  tag: string
  @prop()
  color?: string
  @prop({ required: true, default: 0 })
  numberOfUses?: number

  @instanceMethod
  stripped() {
    const stripFields = ['__v', 'user']
    return omit(
      { ...this._doc, ...{ _tempSyncId: this._tempSyncId } },
      stripFields
    ) as Tag
  }

  // Mongo property
  _doc: any
  _id: string
  // Temporary sync property
  _tempSyncId?: string
}

export const TagModel = new Tag().getModelForClass(Tag, {
  schemaOptions: { timestamps: true },
})

export async function addTags(user: InstanceType<User>, tags: string[]) {
  const dbtags = await TagModel.find({ user: user._id, deleted: false })
  const tagsCountMap = tags.reduce((p, c) => {
    if (p[c]) {
      p[c]++
    } else {
      p[c] = 1
    }
    return p
  }, {} as { [index: string]: number })
  for (const tag of dbtags) {
    if (tagsCountMap[tag.tag]) {
      tag.numberOfUses += tagsCountMap[tag.tag]
      await tag.save()
    }
  }
  const dbtagstexts = dbtags.map((tag) => tag.tag)
  const tagsToAdd = tags.filter((tag) => !dbtagstexts.includes(tag))
  const tagsToAddMap = tagsToAdd.reduce((p, c) => {
    p[c] = true
    return p
  }, {})
  for (const tag of Object.keys(tagsToAddMap)) {
    await new TagModel({ user: user._id, tag }).save()
  }
}
