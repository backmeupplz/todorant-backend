import { Context } from 'telegraf'
import { convert } from 'convert-svg-to-png'
import { getSvg } from 'cnf-qrcode'
import { report } from '@/helpers/report'

export function sendQR(ctx: Context) {
  getSvg(ctx.dbuser.token, undefined, async (err: any, svg: string) => {
    if (err) {
      report(err)
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
          report(err)
        }
      }, 5 * 60 * 1000)
    }
  })
}
