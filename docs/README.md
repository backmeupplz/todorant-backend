# General notes

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
