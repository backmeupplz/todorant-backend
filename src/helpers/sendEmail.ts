import * as nodemailer from 'nodemailer'
import * as mg from 'nodemailer-mailgun-transport'

// This is your API key that you retrieve from www.mailgun.com/cp (free up to 10K monthly emails)
const auth = {
  auth: {
    api_key: process.env.NODE_ENV === 'test' ? ' ' : process.env.EMAIL_API_KEY,
    domain: process.env.NODE_ENV === 'test' ? ' ' : process.env.EMAIL_DOMAIN,
  },
}

const transport = nodemailer.createTransport(mg(auth))

export async function sendBouncerMessage(email: string) {
  await transport.sendMail({
    from: '"Todorant Support" <support@todorant.com>',
    to: email,
    replyTo: 'todorant@borodutch.com',
    subject: 'Todorant feedback request + 1 extra free month of Todorant!',
    text: `Hi there! It's Nikita, the creator of Todorant. Can you please spend just 2 minutes and answer a couple of questions about why you don't use Todorant anymore? You can answer them here: https://forms.gle/nJ6JoASKQc1Juv1j7. Just a couple of minutes — but a massive help to anyone who still uses Todorant. All questions are optional, and the answers are anonymous. I appreciate any help you can provide!

I also gift you another free month of Todorant! Enter the code "1MOREMONTH" when subscribing at todorant.com (only works if you subscribe on the web) — and you will get $5 off.

If you have any additional questions, please contact me directly — https://t.me/borodutch — or reply to this email. Thank you!

***

Привет! Это Никита, создатель Тудуранта. Можете, пожалуйста, потратить 2 минуты и ответить на несколько вопросов, почему вы больше не пользуетесь Тудурантом? Ответить можно по ссылке вот тут: https://forms.gle/nmP1RozzvAZmEUhw6. Всего пара минут — а гигантская польза всем людям, что продолжают добавлять задачи в Тудурант. Все вопросы там необязательны для ответа, а опрос анонимен. Спасибо огромное заранее!

За заполнение этой короткой формы я дарю вам бесплатный месяц Тудуранта! Просто введите код "1MOREMONTH" при оформлении подписки на todorant.com (работает только при оформлении подписки на вебсайте) — и вы получите скидку в $5.

Если у вас есть какие-либо дополнительные вопросы, пожалуйста, напишите мне напрямую — https://t.me/borodutch — или просто ответьте на этот имейл. Спасибо!`,
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

export async function sendUserThreeWeekMessage(
  email: string,
  chart: any,
  subject: string
) {
  await transport.sendMail({
    from: '"Todorant Support" <support@todorant.com>',
    to: email,
    replyTo: 'todorant@borodutch.com',
    subject: subject,
    html: html,
    attachments: [
      {
        filename: 'chart.png',
        content: chart,
        cid: 'chart@img.ee',
      },
    ],
  })
}

const html = `
<body style="margin: 0; padding: 0;">
  <table align="center" border="0" cellpadding="0" cellspacing="0" width="600" style="border-collapse: collapse;">
    <tr>
      <td align="center" bgcolor="#ffffff" style="padding: 40px 0 30px 0;">
        <img src="cid:chart@img.ee" width="700" height="700" style="display: block;" />
      </td>
    </tr>
    <tr>
      <td bgcolor="#ffffff" style="padding: 40px 30px 40px 30px;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td style="color: #153643; font-family: Arial, sans-serif; font-size: 24px;">
              <b>Hey there! It's Nikita, the creator of Todorant.</b>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 0 30px 0; color: #153643; font-family: Arial, sans-serif; font-size: 16px; line-height: 20px;">
              You've just finished your third week using Todorant. It means that soon you'll need to make the decision whether to keep using Todorant or not. Just to give you some context, I compiled a chart of how many tasks you finished during these 3 weeks and of how many tasks you are projected to finish in the next 3 weeks if you keep using Todorant!
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 0 30px 0; color: #153643; font-family: Arial, sans-serif; font-size: 16px; line-height: 20px;">
              I used your historical data and the historical data of other people using Todorant to come up with the numbers. Just wanted to share this with you, no strings attached. Email me if you have any questions! Cheers!
            </td>
          </tr>
          <tr>
            <td align="right" style="padding: 20px 0 30px 0; color: #153643; font-family: Arial, sans-serif; font-size: 16px; line-height: 20px;">
              — Nikita
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>`
