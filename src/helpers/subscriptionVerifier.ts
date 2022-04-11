const iap: IAPVerifier = require('in-app-purchase')

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
  receipt: {
    receipt_type: 'ProductionSandbox'
    adam_id: 0
    app_item_id: 0
    bundle_id: 'com.todorant.app'
    application_version: '174'
    download_id: 0
    version_external_identifier: 0
    receipt_creation_date: '2022-04-11 17:27:20 Etc/GMT'
    receipt_creation_date_ms: '1649698040000'
    receipt_creation_date_pst: '2022-04-11 10:27:20 America/Los_Angeles'
    request_date: '2022-04-11 17:32:14 Etc/GMT'
    request_date_ms: '1649698334035'
    request_date_pst: '2022-04-11 10:32:14 America/Los_Angeles'
    original_purchase_date: '2013-08-01 07:00:00 Etc/GMT'
    original_purchase_date_ms: '1375340400000'
    original_purchase_date_pst: '2013-08-01 00:00:00 America/Los_Angeles'
    original_application_version: '1.0'
  }
  latest_receipt_info: Array<Recepint>
  latest_receipt: string
  pending_renewal_info: [
    {
      auto_renew_product_id: 'monthly.with.trial'
      product_id: 'monthly.with.trial'
      original_transaction_id: '2000000030311878'
      auto_renew_status: '1'
    }
  ]
  status: 0
  sandbox: true
  service: 'apple'
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
    googleServiceAccount: {
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
      test: true, // For Apple and Googl Play to force Sandbox validation only
      applePassword: process.env.APPLE_SECRET,
      /* Configurations for Google Service Account validation: You can validate with just packageName, productId, and purchaseToken */
      googleServiceAccount: {
        clientEmail:
          '<client email from Google API service account JSON key file>',
        privateKey:
          '<private key string from Google API service account JSON key file>',
      },
    })
    this.initVerifier()
  }

  private async initVerifier() {
    await iap.setup()
    this.initialized = true
  }

  getValidatedArr(response: any) {
    return iap.getPurchaseData(response, {})
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
