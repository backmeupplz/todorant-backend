import { bot } from '@/helpers/telegram'
import { UserModel } from '@/models/user'
import { sendUserSubcribtionMessage } from '@/helpers/sendEmail'
import { TodoModel } from '@/models/todo'
import * as fs from 'fs'
const { CanvasRenderService } = require('chartjs-node-canvas')
const regression = require('regression')
const homedir = require('os').homedir()

interface TodosMap {
  completedTodosMap: number[][]
  predictedTodosMap: number[][]
}

async function sendMessageToSubscribedUsers() {
  const threeWeeksAgo = {
    start: new Date().setDate(new Date().getDate() - 22),
    end: new Date().setDate(new Date().getDate() - 21),
  }
  // Send to telegram
  const telegramSubscribedUsers = await UserModel.find({
    telegramId: { $exists: true },
    createdAt: { $gte: threeWeeksAgo.start, $lt: threeWeeksAgo.end },
    $and: [
      {
        $or: [
          { userSubscriptionNotified: false },
          { userSubscriptionNotified: { $exists: false } },
        ],
      },
      { subscriptionStatus: 'trial' },
    ],
  })

  for (const subscribedUser of telegramSubscribedUsers) {
    const telegramId = parseInt(subscribedUser.telegramId, 10)
    if (!telegramId) {
      continue
    }
    const todos = (
      await TodoModel.find({
        user: subscribedUser._id,
        completed: true,
        date: { $exists: true },
        deleted: false,
      })
    ).filter((t) => !!t.date)
    const { completedTodosMap, predictedTodosMap } = getTodos(todos) as TodosMap
    const allTodos = completedTodosMap.reduce(
      (sum, todoMap) => sum + todoMap[1],
      0
    )
    if (!allTodos) {
      continue
    }

    try {
      const chart = await renderChart(completedTodosMap, predictedTodosMap)
      await bot.telegram.sendMessage(
        telegramId,
        `Lorem ipsum dolor sit amet, consectetur adipiscing elit, 
        sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. 
        Ut enim ad minim veniam, quis nostrud exercitation ullamco 
        laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor 
        in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. 
        Excepteur sint occaecat cupidatat non proident, 
        sunt in culpa qui officia deserunt mollit anim id est laborum.`,
        {
          disable_web_page_preview: true,
        }
      )
      await bot.telegram.sendPhoto(telegramId, { source: chart })
      await bot.telegram.sendMessage(
        76104711,
        `Sent subscribed user message to ${telegramId}`
      )
    } catch (err) {
      console.error(err)
    }

    subscribedUser.userSubscriptionNotified = true
    await subscribedUser.save()
  }
  // Send to email
  const emailSubscribedUsers = await UserModel.find({
    email: { $exists: true },
    telegramId: { $exists: false },
    createdAt: { $gte: threeWeeksAgo.start, $lt: threeWeeksAgo.end },
    $and: [
      {
        $or: [
          { userSubscriptionNotified: false },
          { userSubscriptionNotified: { $exists: false } },
        ],
      },

      { subscriptionStatus: 'trial' },
    ],
  })

  for (const subscribedUser of emailSubscribedUsers) {
    const email = subscribedUser.email
    if (!email) {
      continue
    }
    const todos = (
      await TodoModel.find({
        user: subscribedUser._id,
        completed: true,
        date: { $exists: true },
        deleted: false,
      })
    ).filter((t) => !!t.date)
    const { completedTodosMap, predictedTodosMap } = getTodos(todos) as TodosMap
    const allTodos = completedTodosMap.reduce(
      (sum, todoMap) => sum + todoMap[1],
      0
    )
    if (!allTodos) {
      continue
    }

    try {
      await renderChart(completedTodosMap, predictedTodosMap)
      await sendUserSubcribtionMessage(email)
      await bot.telegram.sendMessage(
        76104711,
        `Sent subscribed user message to ${email}`
      )
    } catch (err) {
      console.error(err)
    }

    subscribedUser.userSubscriptionNotified = true
    await subscribedUser.save()
  }
}

function getTodos(todos: any) {
  const date = Date.now()
  const oneWeek = 604800000
  const twoWeeks = 1209600000
  const threeWeeks = 1814400000
  const completedTodosMap = [
    [1, 0],
    [2, 0],
    [3, 0],
  ]
  // get the number of completed todos for the last three weeks
  for (const todo of todos) {
    const todoDate = new Date(`${todo.monthAndYear}-${todo.date}`)
    const timeBetween = date - todoDate.getTime()
    if (timeBetween <= oneWeek) {
      completedTodosMap[2][1] = completedTodosMap[2][1] + 1
    } else if (timeBetween <= twoWeeks) {
      completedTodosMap[1][1] = completedTodosMap[1][1] + 1
    } else if (timeBetween <= threeWeeks) {
      completedTodosMap[0][1] = completedTodosMap[0][1] + 1
    }
  }
  // calculating linear regression and get the number of predicted todos
  const todosRegression = regression.linear(completedTodosMap)
  const predictedTodosMap = [undefined, undefined, completedTodosMap[2]]
  predictedTodosMap.push(todosRegression.predict(4))
  predictedTodosMap.push(todosRegression.predict(5))
  predictedTodosMap.push(todosRegression.predict(6))

  return { completedTodosMap, predictedTodosMap }
}

async function renderChart(data?: number[][], predictedData?: number[][]) {
  try {
    const width = 400
    const height = 400
    const chartCallback = () => {}
    const canvasRenderService = new CanvasRenderService(
      width,
      height,
      chartCallback
    )

    const configuration = {
      type: 'line',
      data: {
        labels: [
          'first week',
          'second week',
          'third week',
          'fourth week',
          'fifth week',
          'sixth week',
        ],
        datasets: [
          {
            label: 'Tasks completed',
            data: data.map((todoMap) => todoMap[1]),
            backgroundColor: 'rgba(255, 100, 26, 0.2)',
            borderColor: 'rgba(255, 100, 26, 0.8)',
            borderWidth: 1.5,
            categoryPercentage: 0.25,
            pointBackgroundColor: [
              'rgba(255, 100, 26, 0.8)',
              'rgba(255, 100, 26, 0.8)',
              'rgba(255, 100, 26, 0.8',
            ],
            pointBorderColor: [
              'rgba(255, 100, 26, 0.5)',
              'rgba(255, 100, 26, 0.5)',
              'rgba(255, 100, 26, 0.5',
            ],
            pointRadius: 5,
            pointHoverRadius: 10,
            pointHitRadius: 30,
            pointBorderWidth: 2,
          },
          {
            label: 'Tasks predicted',
            data: predictedData.map((todoMap) =>
              todoMap ? todoMap[1] : undefined
            ),
            backgroundColor: 'rgba(255, 100, 26, 0.2)',
            borderColor: 'rgba(255, 100, 26, 0.8)',
            borderWidth: 1.5,
            categoryPercentage: 0.25,
            pointBackgroundColor: [
              'transparent',
              'transparent',
              'transparent',
              'rgba(153, 102, 255, 0.8)',
              'rgba(153, 102, 255, 0.8)',
              'rgba(153, 102, 255, 0.8)',
            ],
            pointBorderColor: [
              'transparent',
              'transparent',
              'transparent',
              'rgba(153, 102, 255, 0.5)',
              'rgba(153, 102, 255, 0.5)',
              'rgba(153, 102, 255, 0.5)',
            ],
            pointRadius: 5,
            pointHoverRadius: 10,
            pointHitRadius: 30,
            pointBorderWidth: 2,
            pointStyle: 'rectRounded',
            borderDash: [5, 5],
          },
        ],
      },
      options: {
        legend: { display: false },
        title: {
          display: true,
          text: 'Chart header',
        },
        scales: {
          yAxes: [
            {
              ticks: {
                beginAtZero: true,
                stepSize: 2,
                min: 0,
              },
            },
          ],
        },
      },
    }
    const image = await canvasRenderService.renderToBuffer(configuration)
    fs.writeFileSync(`${homedir}/test.png`, image)
    return image
  } catch (err) {
    console.error(err)
  }
}

sendMessageToSubscribedUsers()
setInterval(sendMessageToSubscribedUsers, 24 * 60 * 60 * 1000) // once per day
