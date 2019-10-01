# General notes

- Docs are available in [HTML](https://backend.todorant.com) and [Markdown](https://backend.todorant.com/md)
- API runs at [https://backend.todorant.com](https://backend.todorant.com)
- After obtaining `token` at `/login` you should sign all private requests with it putting it into `token` header

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

## `/state`

### GET `/`

Returns state of the user:

- Whether planning should be done or not
- Subscription status [`earlyAdopter`|`active`|`trial`|`inactive`]
- User created date
  — User settings

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

Creates a todo

### Parameters

| field        | type    | Required | description                                     |
| ------------ | ------- | -------- | ----------------------------------------------- |
| text         | string  | Yes      | Text of the todo                                |
| completed    | boolean | Optional | Whether the todo was done, defaults to `false`  |
| frog         | boolean | Optional | Whether the todo is a frog, defaults to `false` |
| monthAndYear | string  | Yes      | Assigned month and year of this todo            |
| date         | string  | Optional | Assigned date of the todo                       |

### PUT `/`

Edits the todo

### Parameters

| field        | type     | Required | description                                     |
| ------------ | -------- | -------- | ----------------------------------------------- |
| id           | ObjectId | Yes      | ID of the todo to edit                          |
| text         | string   | Yes      | Text of the todo                                |
| monthAndYear | string   | Yes      | Assigned month and year of this todo            |
| today        | string   | Yes      | today's date in format `2019-01-31`             |
| completed    | boolean  | Optional | Whether the todo was done, defaults to `false`  |
| frog         | boolean  | Optional | Whether the todo is a frog, defaults to `false` |
| date         | string   | Optional | Assigned date of the todo                       |
| todat        | string   | Yes      | Today's date in format `2019-01-31`             |

### GET `/`

Returns a list of todos

### Parameters

| field     | type    | Required | description                                                                  |
| --------- | ------- | -------- | ---------------------------------------------------------------------------- |
| completed | boolean | Optional | Whether to return a list of completed or upcoming todos, defaults to `false` |
| hash      | string  | Optional | Search over the list                                                         |

### GET `/current`

Returns current todo and count of today's todos

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

### POST `/:id/skip`

Skips todo

### Parameters

| field | type     | Required | description            |
| ----- | -------- | -------- | ---------------------- |
| id    | ObjectId | Yes      | ID of the todo to skip |

### POST `/rearrange` (incomplete specs, please, ask developers)

### Parameters

| field | type             | Required | description         |
| ----- | ---------------- | -------- | ------------------- |
| todos | [String: Todo[]] | Yes      | rearranged todo map |

## `/subscription`

### GET `/session/:plan`

Get a session for stripe

### Parameters

| field | type   | Required | description           |
| ----- | ------ | -------- | --------------------- |
| plan  | string | Yes      | `monthly` or `yearly` |

## `/settings`

### POST `/`

Set all settings

### Parameters

| field              | type    | Required | description                                                     |
| ------------------ | ------- | -------- | --------------------------------------------------------------- |
| showTodayOnAddTodo | boolean | Yes      | whether to show today date as default on the todo screen or not |

### Put `/`

Set specific settings

### Parameters

| field              | type    | Required | description                                                     |
| ------------------ | ------- | -------- | --------------------------------------------------------------- |
| showTodayOnAddTodo | boolean | Yes      | whether to show today date as default on the todo screen or not |

# Data models

### POST `/cancel`

Cancel subscription for this user

### User

| field      | type   | description                                            |
| ---------- | ------ | ------------------------------------------------------ |
| \_id       | string | Database ID                                            |
| name       | string | User's name                                            |
| email      | string | _Optional._ User's email                               |
| facebookId | string | _Optional._ User's facebook ID                         |
| vkId       | string | _Optional._ User's VK ID                               |
| telegramId | string | _Optional._ User's Telegram ID                         |
| token      | number | _Optional._ Access token used to authenticate requests |

### Todo

| field        | type    | description                                     |
| ------------ | ------- | ----------------------------------------------- |
| \_id         | string  | Database ID                                     |
| text         | string  | Todo's content                                  |
| completed    | boolean | Whether the todo is completed                   |
| frog         | boolean | Whether the todo is a frog                      |
| monthAndYear | string  | Assigned month and year in the format "01-2019" |
| date         | string  | _Optional._ Assigned date in the format "01"    |
