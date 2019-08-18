# General notes

- Docs are available at https://backend.todorant.com (HTML) and https://backend.todorant.com/md (Markdown)
- API runs at https://backend.todorant.com
- [Insomnia](https://insomnia.rest/) schema is in this folder as well
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

### GET `/`

Returns a list of todos

### Parameters

| field     | type    | Required | description                                                                  |
| --------- | ------- | -------- | ---------------------------------------------------------------------------- |
| completed | boolean | Optional | Whether to return a list of completed or upcoming todos, defaults to `false` |

### POST `/:id/done`

Marks todo as done

### Parameters

| field | type     | Required | description                 |
| ----- | -------- | -------- | --------------------------- |
| id    | ObjectId | Yes      | ID of the todo to mark done |

# Data models

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
