import * as nodemailer from 'nodemailer'
const homedir = require('os').homedir()

const transport = nodemailer.createTransport({
  host: 'smtp.yandex.ru',
  port: 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

export async function sendBouncerMessage(email: string) {
  await transport.sendMail({
    from: '"Todorant Support" <support@todorant.com>',
    to: email,
    replyTo: 'todorant@borodutch.com',
    subject: 'Todorant feedback request',
    text: `Привет! Это @borodutch, создатель Тудуранта. Можете, пожалуйста, потратить 2 минуты и ответить на несколько вопросов, почему вы больше не пользуетесь Тудурантом? Ответить можно по ссылке вот тут: https://forms.gle/nmP1RozzvAZmEUhw6. Всего пара минут — а гигантская польза всем людям, что продолжают добавлять задачи в Тудурант. Все вопросы там необязательны для ответа, а опрос анонимен. Спасибо огромное заранее!

Если у вас есть какие-либо дополнительные вопросы, пожалуйста, напишите мне напрямую — @borodutch — или просто ответьте на этот имейл. Спасибо!

***

Hi there! It's @borodutch, the creator of Todorant. Can you please spend just 2 minutes and answer couple of questions why you don't use Todorant anymore? You can answer them here: https://forms.gle/nJ6JoASKQc1Juv1j7. Just a couple of minutes — but huge help to anyone who still uses Todorant. All questions are optional and the answers are anonymous. Thank you a lot in advance!

If you have any additional questions please contact me directly — @borodutch — or simply reply to this email. Thank you!`,
  })
}

export async function sendPowerUserMessage(email: string) {
  await transport.sendMail({
    from: '"Todorant Support" <support@todorant.com>',
    to: email,
    replyTo: 'todorant@borodutch.com',
    subject: 'Woah! Over 1000 tasks! 🎉💪🔥',
    text: `Вот это да! Больше 1000 задач! 🎉💪🔥

Это @borodutch, создатель Тудуранта. Можете, пожалуйста, потратить 2 минуты и ответить на несколько вопросов, что вам больше всего нравится и не нравится в Тудуранте? Ответить можно по ссылке вот тут: https://forms.gle/hNgYMpQyMyJQwiuDA. Всего пара минут — а гигантская польза всем людям, что пользуются Тудурантом! Все вопросы там необязательны для ответа, а опрос анонимен. Спасибо огромное заранее!

Если у вас есть какие-либо дополнительные вопросы, пожалуйста, напишите мне напрямую — @borodutch. Спасибо!

***

Woah! Over 1000 tasks! 🎉💪🔥

Hi there! It's @borodutch, the creator of Todorant. Can you please spend just 2 minutes and answer couple of questions what you like and what you don't like about Todorant? You can answer them here: https://forms.gle/C4Byzcypkd7KsXJHA. Just a couple of minutes — but huge help to anyone who uses Todorant! All questions are optional and the answers are anonymous. Thank you a lot in advance!

If you have any additional questions please contact me directly — @borodutch. Thank you!`,
  })
}

export async function sendUserSubcribtionMessage(email: string) {
  await transport.sendMail({
    from: '"Todorant Support" <support@todorant.com>',
    to: email,
    replyTo: 'todorant@borodutch.com',
    subject: 'Lorem ipsum',
    html: `<div style="display:flex;flex-direction:column;align-items:center">
    <h4>Lorem ipsum dolor sit amet, consectetur adipiscing elit, 
    sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. 
    Ut enim ad minim veniam, quis nostrud exercitation ullamco 
    laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit 
    in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat 
    cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. </h4>
    <img src="cid:image@cid.ee"/>
    </div>`,
    attachments: [
      {
        filename: 'test.png',
        path: `${homedir}/test.png`,
        cid: 'image@cid.ee',
      },
    ],
  })
}
