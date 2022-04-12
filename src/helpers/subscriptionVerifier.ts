// eslint-disable-next-line @typescript-eslint/no-var-requires
const iap: IAPVerifier = require('@borodutch-labs/in-app-purchase')

type Recepint = {
  quantity: number
  product_id: string
  transaction_id: string
  original_transaction_id: string
  purchase_date: Date
  purchase_date_ms: number
  purchase_date_pst: Date
  original_purchase_date: Date
  original_purchase_date_ms: number
  original_purchase_date_pst: Date
  expires_date: Date
  expires_date_ms: number
  expires_date_pst: Date
  web_order_line_item_id: string
  is_trial_period: boolean
  is_in_intro_offer_period: boolean
  in_app_ownership_type: string
  subscription_group_identifier: number
}

type AppleRseponse = {
  environment: 'Sandbox'
  receipt: Record<string, unknown>
  latest_receipt_info: Array<Recepint>
  latest_receipt: string
  sandbox: boolean
}

interface GoogleReceipt {
  data: Record<string, unknown>
  signature: string
}

interface IAPVerifier {
  validateOnce: (
    receipt: string | GoogleReceipt,
    key: string
  ) => Promise<unknown>
  config: (config: {
    appleExcludeOldTransactions?: boolean
    applePassword: string
    googleServiceAccount?: {
      clientEmail: string
      privateKey: string
    }
    test: boolean
    verbose?: boolean
  }) => void
  setup: () => Promise<void>
}

class SubscirptionVerifier {
  private initialized = false

  constructor() {
    iap.config({
      test: process.env.ENVIRONMENT === 'staging' ? true : false, // For Apple and Googl Play to force Sandbox validation only
      applePassword: process.env.APPLE_SECRET,
      // TODO: add google validation trough this library
      // /* Configurations for Google Service Account validation: You can validate with just packageName, productId, and purchaseToken */
      // googleServiceAccount: {
      //   clientEmail:
      //     '<client email from Google API service account JSON key file>',
      //   privateKey:
      //     '<private key string from Google API service account JSON key file>',
      // },
      verbose: process.env.ENVIRONMENT === 'staging' ? true : false,
    })
    this.initVerifier()
  }

  private async initVerifier() {
    await iap.setup()
    this.initialized = true
  }

  async validateGoogle(receipt: GoogleReceipt, key: string) {
    if (!this.initialized) {
      await this.initVerifier()
    }
    return iap.validateOnce(receipt, key)
  }

  async validateApple(receipt: string) {
    if (!this.initialized) {
      await this.initVerifier()
    }
    return iap.validateOnce(
      receipt,
      process.env.APPLE_SECRET
    ) as Promise<AppleRseponse>
  }
}

export const subscriptionVerifier = new SubscirptionVerifier()
