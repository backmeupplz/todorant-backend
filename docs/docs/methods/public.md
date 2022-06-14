# Public Methods

## /login

### `POST` /login/facebook
Signs up with facebook.

Body Parameters

|Field|Type|Required|Description|
|-----|----|--------|-----------|
|accessToken|string|True|Access token obatined from Facebook|

`Return:` [User](/models/user)

### `POST` /login/google
Signs up with google.

Body Parameters

|Field|Type|Required|Description|
|-----|----|--------|-----------|
|accessToken|string|True|Access token obatined from Google|

`Return:` [User](/models/user)

### `POST` /login/telegram
Signs up with telegram.

Body Parameters

|Field|Type|Required|Description|
|-----|----|--------|-----------|
|userData|object|True|User data obatined from Telegram|

`Return:` [User](/models/user)

### `POST` /login/apple
Signs up with apple.

Body Parameters

|Field|Type|Required|Description|
|-----|----|--------|-----------|
|code|object|True|Access code from Apple|

`Return:` [User](/models/user)

### `POST` /login/telegram_mobile
Sends the request to user to authorize by Telegram (through [@todorant_bot](https://t.me/todorant_bot)).

Body Parameters

|Field|Type|Required|Description|
|-----|----|--------|-----------|
|uuid|string|True|ID of the request|
|id|string|True|Telegram ID of the user|

`Return:` [User](/models/user)

### `POST` /login/telegram_mobile_check
Checks the status of request to user to authorize by Telegram (through [@todorant_bot](https://t.me/todorant_bot))

Body Parameters

|Field|Type|Required|Description|
|-----|----|--------|-----------|
|uuid|string|True|ID of the request|

`Return:` [User](/models/user) | bool

### `POST` /login/token
Signs up with token.

Body Parameters

|Field|Type|Required|Description|
|-----|----|--------|-----------|
|token|string|True|Access code from Todorant|

`Return:` [User](/models/user)

## /report

### `GET` /report/public/:uuid

Public method to see shared report.

Query Parameters

|Field|Type|Required|Description|
|-----|----|--------|-----------|
|uuid|string|True|ID of the report|