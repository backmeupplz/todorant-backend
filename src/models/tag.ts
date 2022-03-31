import { prop, Ref, DocumentType, getModelForClass } from '@typegoose/typegoose'
import { omit } from 'lodash'
import { User } from '@/models/user'
import { fromSqlToObject, WMDBTables, WMDBTag } from '@/helpers/wmdb'
import { Document } from 'mongoose'

export class Tag {
  @prop({ required: true, ref: User })
  user: Ref<User>
  @prop({ required: true, default: false })
  deleted: boolean

  @prop({ required: true })
  tag: string
  @prop()
  color?: string

  @prop({ default: false })
  epic?: boolean
  @prop({ default: false })
  epicCompleted?: boolean
  @prop({ default: 0 })
  epicGoal?: number
  @prop({ default: 0 })
  epicPoints?: number
  @prop({ default: 0 })
  epicOrder?: number

  @prop({ default: 0 })
  numberOfUses?: number

  @prop({
    required: false,
    minlength: 16,
    maxlength: 16,
    validate: {
      validator(v) {
        if (!v) {
          return true
        } else {
          return /^[a-zA-Z0-9]{16}$/.test(v)
        }
      },
    },
  })
  clientId?: string

  stripped() {
    const stripFields = ['__v', 'user']
    return omit(
      { ...this._doc, ...{ _tempSyncId: this._tempSyncId } },
      stripFields
    ) as unknown as Tag
  }

  // Mongo property
  _doc: any
  _id: string
  // Temporary sync property
  _tempSyncId?: string
}

export const TagModel = getModelForClass(Tag, {
  schemaOptions: { timestamps: true },
})

export async function addTags(user: DocumentType<User>, tags: string[]) {
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

export async function createWMDBTag(
  sqlRaw: WMDBTag,
  user: User,
  pushBackTags: Tag[]
) {
  const tagFromSql = fromSqlToObject(sqlRaw, WMDBTables.Tag, user._id) as Tag
  tagFromSql.user = user._id
  const query = {
    user: user._id,
    $or: [],
  }
  if (tagFromSql._id) {
    query.$or.push({ _id: tagFromSql._id })
  }
  if (tagFromSql.clientId) {
    query.$or.push({ clientId: tagFromSql.clientId })
  }
  // If no client id nor server id
  if (!query.$or.length) {
    throw new Error(
      'Server id or client id of tag was not specified. Please, try to re-login into your account.'
    )
  }
  const inMongo = await TagModel.findOne(query)
  if (inMongo) {
    await updateWMDBTag(sqlRaw, user, pushBackTags)
    return
  }
  const newTag = await new TagModel(
    omit(tagFromSql, ['_id', 'createdAt', 'updatedAt'])
  ).save()
  pushBackTags.push({
    ...tagFromSql,
    ...(newTag as Document & { _doc: any })._doc,
  })
}

export async function updateWMDBTag(
  sqlRaw: WMDBTag,
  user: User,
  pushBackTags: Tag[]
) {
  const tagFromSql = fromSqlToObject(sqlRaw, WMDBTables.Tag, user._id) as Tag
  const query = {
    user: user._id,
    $or: [],
  }
  if (tagFromSql._id) {
    query.$or.push({ _id: tagFromSql._id })
  }
  if (tagFromSql.clientId) {
    query.$or.push({ clientId: tagFromSql.clientId })
  }
  // If no client id nor server id
  if (!query.$or.length) {
    throw new Error(
      'Server id or client id of tag was not specified. Please, try to re-login into your account.'
    )
  }
  const inMongo = await TagModel.findOne(query)
  if (!inMongo) {
    await createWMDBTag(sqlRaw, user, pushBackTags)
    return
  }
  Object.assign(
    inMongo,
    omit(tagFromSql, ['_id', 'createdAt', 'updatedAt', 'clientId', 'user'])
  )
  await inMongo.save()
}
