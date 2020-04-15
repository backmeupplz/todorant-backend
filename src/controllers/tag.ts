import { errors } from '../helpers/errors'
import { TagModel } from '../models/tag'
import { Context } from 'koa'
import { Controller, Get, Delete, Put } from 'koa-router-ts'
import { authenticate } from '../middlewares/authenticate'
import { requestSync } from '../sockets'

@Controller('/tag')
export default class {
  @Get('/', authenticate)
  async get(ctx: Context) {
    const tags = await TagModel.find({
      user: ctx.state.user._id,
      deleted: false,
    })
    // Respond
    ctx.body = tags.map((t) => t.stripped())
  }

  @Delete('/:id', authenticate)
  async delete(ctx: Context) {
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

  @Put('/:id', authenticate)
  async put(ctx: Context) {
    // Parameters
    const id = ctx.params.id
    const { color } = ctx.request.body
    // Find todo
    const tag = await TagModel.findById(id)
    // Check ownership
    if (!tag || tag.user.toString() !== ctx.state.user._id.toString()) {
      return ctx.throw(404, errors.noTag)
    }
    // Edit and save
    tag.color = color || null
    await tag.save()
    // Respond
    ctx.status = 200
    // Trigger sync
    requestSync(ctx.state.user._id)
  }
}
