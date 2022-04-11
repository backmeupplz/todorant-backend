/* eslint-disable @typescript-eslint/no-var-requires */
const Verifier = require('google-play-billing-validator')

const googleCredentials = require('../../assets/api-4987639842126744234-562450-67105810381f.json')

export const googleSubscriptionValidator = new Verifier({
  email: googleCredentials.client_email,
  key: googleCredentials.private_key,
})
