import { errors } from '@/helpers/errors'
import { Tag, TagModel } from '@/models/tag'
import { Context } from 'koa'
import {
  Controller,
  Ctx,
  Delete,
  Flow,
  Put,
  Get,
  Post,
} from 'koa-ts-controllers'
import { authenticate } from '@/middlewares/authenticate'
import { requestSync } from '@/sockets/index'
import { changeTagInTodos } from '@/helpers/changeTagInTodos'

@Controller('/tag')
export default class TagController {
  @Get('/')
  @Flow(authenticate)
  async get(@Ctx() ctx: Context) {
    return await getTagsBody(ctx)
  }

  @Delete('/all')
  @Flow(authenticate)
  async deleteAll(@Ctx() ctx: Context) {
    // Update todos
    await TagModel.updateMany(
      {
        user: ctx.state.user._id,
        deleted: false,
      },
      {
        deleted: true,
      }
    )
    // Respond
    ctx.status = 200
    // Trigger sync
    requestSync(ctx.state.user._id)
  }

  @Delete('/:id')
  @Flow(authenticate)
  async delete(@Ctx() ctx: Context) {
    // Parameters
    const id = ctx.params.id
    // Find todo
    const tag = await TagModel.findById(id)
    // Check ownership
    if (!tag || tag.user.toString() !== ctx.state.user._id.toString()) {
      return ctx.throw(404, errors.noTag)
    }
    // Edit and save
    tag.deleted = true
    await tag.save()
    // Respond
    ctx.status = 200
    // Trigger sync
    requestSync(ctx.state.user._id)
  }

  @Put('/:id')
  @Flow(authenticate)
  async put(@Ctx() ctx: Context) {
    // Parameters
    const id = ctx.params.id
    const {
      color,
      epic,
      epicCompleted,
      epicGoal,
      newName,
      epicOrder,
    } = ctx.request.body
    // Find tag
    const tag = await TagModel.findById(id)
    // Check ownership
    if (!tag || tag.user.toString() !== ctx.state.user._id.toString()) {
      return ctx.throw(404, errors.noTag)
    }
    // Check if completed
    if (epicCompleted) {
      tag.epicPoints = 0
    }
    // Edit and save
    tag.color = color || null
    tag.epic = epic || false
    tag.epicCompleted = epicCompleted || false
    tag.epicGoal = epicGoal || 0
    tag.epicOrder = epicOrder || 0
    if (newName && !!newName.match(/^[\S]+$/)) {
      await changeTagInTodos(`#${tag.tag}`, newName, ctx.state.user._id)
      tag.tag = newName
    }
    await tag.save()
    // Respond
    ctx.status = 200
    // Trigger sync
    requestSync(ctx.state.user._id)
  }

  @Post('/rearrage')
  @Flow(authenticate)
  async rearrage(@Ctx() ctx: Context) {
    const epics = ctx.request.body.epics as Tag[]
    await Promise.all(
      epics.map(async (epic) => {
        await TagModel.updateOne(
          { _id: epic._id },
          { epicOrder: epic.epicOrder }
        )
      })
    )
    ctx.status = 200
    // Trigger sync
    requestSync(ctx.state.user._id)
  }

  @Put('/unEpic/:id')
  @Flow(authenticate)
  async unEpic(@Ctx() ctx: Context) {
    // Parameters
    const id = ctx.params.id
    // Find tag
    const tag = await TagModel.findById(id)
    // Check ownership
    if (!tag || tag.user.toString() !== ctx.state.user._id.toString()) {
      return ctx.throw(404, errors.noTag)
    }
    // Edit and save
    tag.epicPoints = 0
    tag.epic = false
    tag.epicCompleted = false
    tag.epicGoal = 0
    tag.epicOrder = 0
    await tag.save()
    // Respond
    ctx.status = 200
    // Trigger sync
    requestSync(ctx.state.user._id)
  }
}

export async function getTagsBody(ctx: Context) {
  const tags = await TagModel.find({
    user: ctx.state.user._id,
    deleted: false,
  }).sort({ numberOfUses: -1 })
  // Respond
  return tags.map((t) => t.stripped())
}
