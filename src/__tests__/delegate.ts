import * as request from 'supertest'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { Server } from 'http'
import { TodoModel } from '@/models/todo'
import { UserModel } from '@/models/user'
import { app } from '@/app'
import {
  completeTodo,
  completeUser,
  dropMongo,
  startKoa,
  stopServer,
} from '@/__tests__/testUtils'
import { runMongo, stopMongo } from '@/models/index'
import { sign } from '@/helpers/jwt'
import MockAdapter from 'axios-mock-adapter'
import axios from 'axios'

describe('Testing delegate controller', () => {
  new MockAdapter(axios)
  let server: Server
  let userDelegator
  let user
  let todo

  beforeAll(async () => {
    const mongoServer = new MongoMemoryServer()
    await runMongo(await mongoServer.getUri())
    server = await startKoa(app)
  })

  beforeEach(async () => {
    await dropMongo()
    const tokenDelegator = await sign(completeUser)
    userDelegator = await UserModel.create({
      ...completeUser,
      token: tokenDelegator,
    })
    await request(server)
      .post('/delegate/generateToken')
      .set('token', userDelegator.token)
      .set('Accept', 'application/json').data
    const baseUser = {
      name: 'Testing User',
      email: 'testingname@gmail.com',
    }
    const tokenUser = await sign(baseUser)
    user = await UserModel.create({
      ...baseUser,
      token: tokenUser,
    })
    completeTodo.user = user._id
    completeTodo.delegator = userDelegator._id
    todo = await TodoModel.create({ ...completeTodo })
  })

  afterAll(async () => {
    await stopMongo()
    await stopServer(server)
  })

  it('should return delegate invite token', async () => {
    const token = await request(server)
      .post('/delegate/generateToken')
      .set('token', user.token)
      .set('Accept', 'application/json')
      .expect(200)
    expect(typeof token.text).toBe('string')
    expect(token.text.length).toBe(16)
  })

  it('user should to have delegates', async () => {
    await request(server)
      .post('/delegate/useToken')
      .set('token', user.token)
      .set('Accept', 'application/json')
      .send({ token: userDelegator.delegateInviteToken })
      .expect(204)
  })

  it('/useToken should to throw 404 error', async () => {
    const invalidToken = 'n65666666d95ptH2'
    await request(server)
      .post('/delegate/useToken')
      .set('token', user.token)
      .set('Accept', 'application/json')
      .send({ token: invalidToken })
      .expect(404)
  })

  it('should return delegate info', async () => {
    await request(server)
      .post('/delegate/useToken')
      .set('token', user.token)
      .set('Accept', 'application/json')
      .send({ token: userDelegator.delegateInviteToken })

    const delegateInfoRes = await request(server)
      .get('/delegate')
      .set('token', userDelegator.token)
      .set('Accept', 'application/json')
      .expect(200)
    const delegateInfo = JSON.parse(delegateInfoRes.text)
    expect(Boolean(delegateInfo)).toBe(true)
    expect(delegateInfo.delegates[0].name).toBe('Testing User')
    expect(delegateInfo.delegators).toStrictEqual([])
    expect(delegateInfo.token).toBe(userDelegator.delegateInviteToken)
  })

  it('should to delete delegate', async () => {
    await request(server)
      .post('/delegate/useToken')
      .set('token', user.token)
      .set('Accept', 'application/json')
      .send({ token: userDelegator.delegateInviteToken })

    await request(server)
      .delete('/delegate/delegate/' + user.id)
      .set('token', userDelegator.token)
      .set('Accept', 'application/json')
      .expect(204)
    const userTest = await UserModel.findById(userDelegator.id)
    const checkingArray = userTest.delegates.filter(
      (id) => id.toString() == user.id
    )
    expect(Boolean(checkingArray[0])).toBe(false)
  })

  it('should to delete delegator', async () => {
    await request(server)
      .post('/delegate/useToken')
      .set('token', user.token)
      .set('Accept', 'application/json')
      .send({ token: userDelegator.delegateInviteToken })

    await request(server)
      .delete('/delegate/delegator/' + userDelegator.id)
      .set('token', user.token)
      .set('Accept', 'application/json')
      .expect(204)
    const userTest = await UserModel.findById(userDelegator.id)
    const checkingArray = userTest.delegates.filter(
      (id) => id.toString() == user.id
    )
    expect(Boolean(checkingArray[0])).toBe(false)
  })

  it('should to return unaccepted todos', async () => {
    const todosRes = await request(server)
      .get('/delegate/unaccepted/')
      .set('token', user.token)
      .set('Accept', 'application/json')
      .expect(200)
    const todos = JSON.parse(todosRes.text)
    expect(Boolean(todos)).toBe(true)
    expect(todos[0].user.name).toBe('Testing User')
  })

  it('should to accept todo', async () => {
    await request(server)
      .post('/delegate/accept/' + todo.id)
      .set('token', user.token)
      .set('Accept', 'application/json')
      .expect(204)
  })

  it('should to throw 404 error due to invalidId', async () => {
    const invalidId = '11111e6f0bce1d133c55568d'
    await request(server)
      .post('/delegate/accept/' + invalidId)
      .set('token', user.token)
      .set('Accept', 'application/json')
      .expect(404)
  })

  it('should to return all todos from delegator', async () => {
    const todosRes = await request(server)
      .get('/delegate/todos')
      .set('token', userDelegator.token)
      .set('Accept', 'application/json')
      .expect(200)

    const todos = JSON.parse(todosRes.text)
    expect(Boolean(todos)).toBe(true)
    expect(typeof todos).toBe('object')
    expect(todos[0].user.name).toBe('Testing User')
  })
})
