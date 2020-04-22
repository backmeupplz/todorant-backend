# General notes

- Docs are available in [HTML](https://backend.todorant.com) and [Markdown](https://backend.todorant.com/md)
- API runs at [https://backend.todorant.com](https://backend.todorant.com)
- After obtaining `token` at `/login` you should sign all private requests with it putting it into `token` header
- New version of API relies heavily on Socket.io, ask [@borodutch](https://t.me/borodutch) for the access and docs

# API documentation

## `/login`

### [Public] POST `/facebook`

Signs up with facebook, returns [User](#user).

#### Parameters

| field       | type   | Required | description                         |
| ----------- | ------ | -------- | ----------------------------------- |
| accessToken | string | Yes      | Access token obatined from Facebook |

### [Public] POST `/google`

Signs up with google, returns [User](#user).

#### Parameters

| field       | type   | Required | description                       |
| ----------- | ------ | -------- | --------------------------------- |
| accessToken | string | Yes      | Access token obatined from Google |

### [Public] POST `/telegram`

Signs up with telegram, returns [User](#user).

#### Parameters

| field    | type   | Required | description                      |
| -------- | ------ | -------- | -------------------------------- |
| userData | object | Yes      | User data obatined from Telegram |

### [Public] POST `/apple`

Signs up with apple, returns [User](#user).

#### Parameters

| field | type   | Required | description            |
| ----- | ------ | -------- | ---------------------- |
| code  | object | Yes      | Access code from Apple |

### [Public] POST `/telegram_mobile`

Sends the request to user to authorize by Telegram (through [@todorant_bot](https://t.me/todorant_bot)).

#### Parameters

| field | type   | Required | description             |
| ----- | ------ | -------- | ----------------------- |
| uuid  | string | Yes      | ID of the request       |
| id    | string | Yes      | Telegram ID of the user |

### [Public] POST `/telegram_mobile_check`

Checks the status of request to user to authorize by Telegram (through [@todorant_bot](https://t.me/todorant_bot)). Returns `allowed` boolean and [User](#user) (if `allowed` is `true`).

#### Parameters

| field | type   | Required | description       |
| ----- | ------ | -------- | ----------------- |
| uuid  | string | Yes      | ID of the request |

## `/apple`

### POST `/subscription`

Verifies Apple purchase.

#### Parameters

| field   | type   | Required | description     |
| ------- | ------ | -------- | --------------- |
| receipt | string | Yes      | Apple's receipt |

## `/google`

### POST `/subscription`

Verifies Google purchase. Send all data Google gives you as body.

## `/state`

### GET `/`

Returns state of the user:

- Whether planning should be done or not
- Subscription status [`earlyAdopter`|`active`|`trial`|`inactive`]
- User created date
- If subscription ID exists
- Subscription type [`none`, `apple`, `web`, `google`]
- User settings

### Parameters

| field | type   | Required | description                                       |
| ----- | ------ | -------- | ------------------------------------------------- |
| date  | string | Yes      | Current date on the client in format `2020-01-20` |

## `/merge`

### POST `/facebook`

Merges facebook account to this account.

#### Parameters

| field       | type   | Required | description                         |
| ----------- | ------ | -------- | ----------------------------------- |
| accessToken | string | Yes      | Access token obatined from Facebook |

### POST `/google`

Merges google account to this account.

#### Parameters

| field       | type   | Required | description                       |
| ----------- | ------ | -------- | --------------------------------- |
| accessToken | string | Yes      | Access token obatined from Google |

### POST `/telegram`

Merges telegram account to this account.

#### Parameters

| field    | type   | Required | description                      |
| -------- | ------ | -------- | -------------------------------- |
| userData | object | Yes      | User data obatined from Telegram |

## `/todo`

### POST `/`

Creates todos, you can send an array of [Todo](#todo) objects here.

### PUT `/`

Edits the todo, send [Todo](#todo) object here.

### GET `/`

Returns a list of todos.

### Parameters

| field     | type    | Required | description                                                                  |
| --------- | ------- | -------- | ---------------------------------------------------------------------------- |
| completed | boolean | Optional | Whether to return a list of completed or upcoming todos, defaults to `false` |
| hash      | string  | Optional | Search over the list                                                         |

### GET `/current`

Returns current todo, count of today's todos, and count of today's incomlete todos.

### Parameters

| field | type   | Required | description                                       |
| ----- | ------ | -------- | ------------------------------------------------- |
| date  | string | Yes      | Current date on the client in format `2020-01-20` |

### POST `/:id/done`

Marks todo as done

### Parameters

| field | type     | Required | description                 |
| ----- | -------- | -------- | --------------------------- |
| id    | ObjectId | Yes      | ID of the todo to mark done |

### POST `/:id/undone`

Marks todo as not done

### Parameters

| field | type     | Required | description                     |
| ----- | -------- | -------- | ------------------------------- |
| id    | ObjectId | Yes      | ID of the todo to mark not done |

### DELETE `/:id`

Deletes a todo

### Parameters

| field | type     | Required | description              |
| ----- | -------- | -------- | ------------------------ |
| id    | ObjectId | Yes      | ID of the todo to delete |

### POST `/:id/skip`

Skips todo

### Parameters

| field | type     | Required | description            |
| ----- | -------- | -------- | ---------------------- |
| id    | ObjectId | Yes      | ID of the todo to skip |

### POST `/rearrange`

A map of todo date (e.g. `2020-01`, `2020-01-01`) to the list of todos.

### Parameters

| field | type                      | Required | description                             |
| ----- | ------------------------- | -------- | --------------------------------------- |
| todos | [String: [Todo](#todo)[]] | Yes      | rearranged todo map                     |
| today | String                    | Yes      | today's date in the format `2020-12-17` |

## `/subscription`

### GET `/session/:plan`

Get a session for stripe

### Parameters

| field | type   | Required | description           |
| ----- | ------ | -------- | --------------------- |
| plan  | string | Yes      | `monthly` or `yearly` |

### POST `/cancel`

Cancel stripe subscription

## `/settings`

### POST `/`

Set settings.

### Parameters

| field              | type    | Required | description                                                     |
| ------------------ | ------- | -------- | --------------------------------------------------------------- |
| showTodayOnAddTodo | boolean | No       | Whether to show today date as default on the todo screen or not |
| firstDayOfWeek     | numbex  | No       | First day of the week where Sunday is 0                         |
| showTodayOnAddTodo | boolean | No       | Whether to put new todos on top of the list or on the bottom    |

## `/report`

### GET `/`

Method to get current report.

### Parameters

| field     | type   | Required | description              |
| --------- | ------ | -------- | ------------------------ |
| hash      | string | No       | Hashtag to filter tasks  |
| startDate | Date   | No       | Report period start date |
| endDate   | Date   | No       | Report period end date   |

### [Public] GET `/public/:uuid`

Public method to see shared report.

### Parameters

| field | type   | Required | description      |
| ----- | ------ | -------- | ---------------- |
| uuid  | string | Yes      | ID of the report |

### `/share`

Method to share a snapshot of a specific report with other people.

### Parameters

| field     | type   | Required | description              |
| --------- | ------ | -------- | ------------------------ |
| hash      | string | No       | Hashtag to filter tasks  |
| startDate | Date   | No       | Report period start date |
| endDate   | Date   | No       | Report period end date   |

# Data models

### User

| field              | type    | description                                                 |
| ------------------ | ------- | ----------------------------------------------------------- |
| \_id               | string  | Database ID                                                 |
| name               | string  | User's name                                                 |
| email              | string  | _Optional._ User's email                                    |
| facebookId         | string  | _Optional._ User's facebook ID                              |
| telegramId         | string  | _Optional._ User's Telegram ID                              |
| appleSubId         | string  | _Optional._ User's Apple ID                                 |
| token              | number  | _Optional._ Access token used to authenticate requests      |
| settings           | object  | _Optional._ User's settings                                 |
| timezone           | number  | _Optional._ User's timezone UTC+{timezone}                  |
| telegramZen        | boolean | _Optional._ Whether Telegram Zen mode is on                 |
| telegramLanguage   | string  | _Optional._ Language selected in Telegram bot               |
| subscriptionStatus | string  | _Optional._ Status of subscription                          |
| subscriptionId     | string  | _Optional._ ID of stripe subscription                       |
| appleReceipt       | string  | _Optional._ Apple purchase receipt                          |
| googleReceipt      | string  | _Optional._ Google purchase receipt                         |
| createdOnApple     | boolean | _Optional._ Whether the account was created on Apple device |

### Todo

| field        | type    | description                                                |
| ------------ | ------- | ---------------------------------------------------------- |
| \_id         | string  | Database ID (optional when creating a todo)                |
| text         | string  | Todo's content                                             |
| completed    | boolean | Whether the todo is completed                              |
| frog         | boolean | Whether the todo is a frog                                 |
| frogFails    | number  | Number of times frog was failed                            |
| skipped      | boolean | Whether this task was skipped                              |
| order        | number  | Task order within this day                                 |
| monthAndYear | string  | Assigned month and year in the format "01-2019"            |
| date         | string  | _Optional._ Assigned date in the format "01"               |
| time         | string  | _Optional._ Exact time in the format "23:01"               |
| goFirst      | boolean | _Optional._ Overwriting the user setting when adding todos |
