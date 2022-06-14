# User model

| Field              | Type   | Description                                                 |
| ------------------ | ------ | ----------------------------------------------------------- |
| \_id               | string | Database ID                                                 |
| name               | string | User's name                                                 |
| email              | string | _Optional._ User's email                                    |
| facebookId         | string | _Optional._ User's facebook ID                              |
| telegramId         | string | _Optional._ User's Telegram ID                              |
| appleSubId         | string | _Optional._ User's Apple ID                                 |
| token              | int    | _Optional._ Access token used to authenticate requests      |
| settings           | object | _Optional._ User's settings                                 |
| timezone           | int    | _Optional._ User's timezone UTC+{timezone}                  |
| telegramZen        | bool   | _Optional._ Whether Telegram Zen mode is on                 |
| telegramLanguage   | string | _Optional._ Language selected in Telegram bot               |
| subscriptionStatus | string | _Optional._ Status of subscription                          |
| subscriptionId     | string | _Optional._ ID of stripe subscription                       |
| appleReceipt       | string | _Optional._ Apple purchase receipt                          |
| googleReceipt      | string | _Optional._ Google purchase receipt                         |
| createdOnApple     | bool   | _Optional._ Whether the account was created on Apple device |
