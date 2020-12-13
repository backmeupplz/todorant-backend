import { bot } from '@/helpers/telegram'
import { UserModel } from '@/models/user'
import { sendUserThreeWeekMessage } from '@/helpers/sendEmail'
import { TodoModel } from '@/models/todo'
const { CanvasRenderService } = require('chartjs-node-canvas')
const regression = require('regression')

interface TodosMap {
  completedTodosMap: number[]
  predictedTodosMap: number[]
}

async function sendMessageToThreeWeekUsers() {
  const threeWeeksAgo = {
    start: new Date().setDate(new Date().getDate() - 22),
    end: new Date().setDate(new Date().getDate() - 21),
  }
  // Send to telegram
  const telegramThreeWeekUsers = await UserModel.find({
    telegramId: { $exists: true },
    createdAt: { $gte: threeWeeksAgo.start, $lt: threeWeeksAgo.end },
    $and: [
      {
        $or: [
          { threeWeekUserNotified: false },
          { threeWeekUserNotified: { $exists: false } },
        ],
      },
      { subscriptionStatus: 'trial' },
    ],
  })

  for (const threeWeekUser of telegramThreeWeekUsers) {
    const telegramId = parseInt(threeWeekUser.telegramId, 10)
    if (!telegramId) {
      continue
    }
    const todos = (
      await TodoModel.find({
        user: threeWeekUser._id,
        completed: true,
        date: { $exists: true },
        deleted: false,
      })
    ).filter((t) => !!t.date)
    const { completedTodosMap, predictedTodosMap } = getTodos(todos) as TodosMap
    const completedTodosSum = completedTodosMap.reduce((s, t) => s + t, 0)
    const predictedTodosSum = predictedTodosMap
      .slice(-3)
      .reduce((s, t) => s + t, 0)
    if (!(completedTodosSum && completedTodosSum < predictedTodosSum)) {
      continue
    }

    try {
      const chart = await renderChart(completedTodosMap, predictedTodosMap)
      await sendTelegramMessage(telegramId, chart)
      await sendTelegramMessage(76104711, chart)
      await bot.telegram.sendMessage(
        76104711,
        `Sent threeWeek user message to ${telegramId}`
      )
    } catch (err) {
      console.error(err)
    }

    threeWeekUser.threeWeekUserNotified = true
    await threeWeekUser.save()
  }
  // Send to email
  const emailThreeWeekUsers = await UserModel.find({
    email: { $exists: true },
    telegramId: { $exists: false },
    createdAt: { $gte: threeWeeksAgo.start, $lt: threeWeeksAgo.end },
    $and: [
      {
        $or: [
          { threeWeekUserNotified: false },
          { threeWeekUserNotified: { $exists: false } },
        ],
      },
      { subscriptionStatus: 'trial' },
    ],
  })

  for (const threeWeekUser of emailThreeWeekUsers) {
    const email = threeWeekUser.email
    if (!email) {
      continue
    }
    const todos = (
      await TodoModel.find({
        user: threeWeekUser._id,
        completed: true,
        date: { $exists: true },
        deleted: false,
      })
    ).filter((t) => !!t.date)
    const { completedTodosMap, predictedTodosMap } = getTodos(todos) as TodosMap
    const completedTodosSum = completedTodosMap.reduce((s, t) => s + t, 0)
    const predictedTodosSum = predictedTodosMap
      .slice(-3)
      .reduce((s, t) => s + t, 0)
    if (!(completedTodosSum && completedTodosSum < predictedTodosSum)) {
      continue
    }

    try {
      const chart = await renderChart(completedTodosMap, predictedTodosMap)
      await sendUserThreeWeekMessage(
        email,
        chart,
        'Check out your progress at Todorant 💪'
      )
      await sendUserThreeWeekMessage(
        'n@borodutch.com',
        chart,
        `Sent threeWeek user message to ${email}`
      )
      await bot.telegram.sendMessage(
        76104711,
        `Sent threeWeek user message to ${email}`
      )
    } catch (err) {
      console.error(err)
    }

    threeWeekUser.threeWeekUserNotified = true
    await threeWeekUser.save()
  }
}

function getTodos(todos: any) {
  const date = Date.now()
  const oneWeek = 604800000
  const twoWeeks = 1209600000
  const threeWeeks = 1814400000
  let completedTodosMap: any = [
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
  let predictedTodosMap = [undefined, undefined, completedTodosMap[2]]
  predictedTodosMap.push(todosRegression.predict(4))
  predictedTodosMap.push(todosRegression.predict(5))
  predictedTodosMap.push(todosRegression.predict(6))
  // convert data
  completedTodosMap = completedTodosMap.map((todoMap) => todoMap[1])
  predictedTodosMap = predictedTodosMap.map((todoMap) =>
    todoMap ? todoMap[1] : undefined
  )
  return { completedTodosMap, predictedTodosMap }
}

async function renderChart(data: number[], predictedData: number[]) {
  try {
    const width = 700
    const height = 700
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
            data: data,
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
            data: predictedData,
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
          text: 'Check out your progress at Todorant',
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
    return image
  } catch (err) {
    console.error(err)
  }
}

async function sendTelegramMessage(id: number, chart: any) {
  await bot.telegram.sendPhoto(
    id,
    { source: chart },
    {
      caption: `Hey there! It's Nikita, the creator of Todorant.

You've just finished your third week using Todorant. It means that soon you'll need to make the decision whether to keep using Todorant or not. Just to give you some context, I compiled a chart of how many tasks you finished during these 3 weeks and of how many tasks you are projected to finish in the next 3 weeks if you keep using Todorant!

I used your historical data and the historical data of other people using Todorant to come up with the numbers. Just wanted to share this with you, no strings attached. Contact me — @borodutch — if you have any questions! Cheers!

— Nikita`,
    }
  )
}

sendMessageToThreeWeekUsers()
setInterval(sendMessageToThreeWeekUsers, 24 * 60 * 60 * 1000) // once per day
