import { ContextMessageUpdate } from 'telegraf'
import { getSvg } from 'cnf-qrcode'
import { convert } from 'convert-svg-to-png'

export function sendQR(ctx: ContextMessageUpdate) {
  getSvg(ctx.dbuser.token, undefined, async (err: any, svg: string) => {
    if (err) {
      console.log(err)
    } else {
      const png = await convert(svg, {
        width: 300,
        height: 300,
        puppeteer: {
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
        },
      })
      const msg = await ctx.replyWithPhoto({ source: png })
      setTimeout(async () => {
        try {
          await ctx.telegram.deleteMessage(ctx.chat.id, msg.message_id)
        } catch (err) {
          console.log(err.message)
        }
      }, 5 * 60 * 1000)
    }
  })
}
