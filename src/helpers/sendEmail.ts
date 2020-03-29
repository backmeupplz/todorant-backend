// Dependencies
import * as nodemailer from 'nodemailer'

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
