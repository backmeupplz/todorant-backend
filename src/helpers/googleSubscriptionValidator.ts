const Verifier = require('google-play-billing-validator')

const googleCredentials = require('../../assets/api-4987639842126744234-562450-c85efe0aadfc.json')

export const googleSubscriptionValidator = new Verifier({
  email: googleCredentials.client_email,
  key: googleCredentials.private_key,
})
