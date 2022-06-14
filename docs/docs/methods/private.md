# Private Methods

## /apple

### `POST` /apple/subscription
Verifies Apple purchase.

Body Parameters

|Field|Type|Required|Description|
|-----|----|--------|-----------|
|receipt|string|True|Apple's receipt|



## /google

### `POST` /google/subscription
Verifies Google purchase. Send all data Google gives you as body.

### `GET` /google/calendarAuthenticationURL
Gives google calendar OAuth URL.

### `POST` /google/calendarAuthorize
Verifies Apple purchase.

Body Parameters

|Field|Type|Required|Description|
|-----|----|--------|-----------|
|code|string|True|Authorization code|

`Return:` token for the google calendar

## /state

### `GET` /state/

Query Parameters

|Field|Type|Required|Description|
|-----|----|--------|-----------|
|date|string|True|Current date on the client in format `2020-01-20`|

`Return:` state of the user:

- Whether planning should be done or not
- Subscription status [`earlyAdopter`|`active`|`trial`|`inactive`]
- User created date
- If subscription ID exists
- Subscription type [`none`, `apple`, `web`, `google`]
- User settings


## /merge

### `POST` /merge/facebook

Merges facebook account to this account.

Body Parameters

|Field|Type|Required|Description|
|-----|----|--------|-----------|
|accessToken|string|True|Access token obatined from Facebook|

### `POST` /merge/google

Merges google account to this account.

Body Parameters

|Field|Type|Required|Description|
|-----|----|--------|-----------|
|accessToken|string|True|Access token obatined from Google|

### `POST` /merge/telegram

Merges telegram account to this account.

Body Parameters

|Field|Type|Required|Description|
|-----|----|--------|-----------|
|userData|object|True|User data obatined from Telegram|


## /todo

### `POST` /todo/

Creates todos, you can send an array of [Todo](/models/todo) objects here.

### `PUT` /todo/

Edits the todo, send [Todo](/models/todo) object here.

### `GET` /todo/

Creates todos, you can send an array of [Todo](/models/todo) objects here.

Query Parameters

|Field|Type|Required|Description|
|-----|----|--------|-----------|
|completed|bool|Optional|Whether to return a list of completed or upcoming todos, defaults to `false`|
|hash|string|Optional|Search over the list|
|queryString|string|Optional|Search over the list|


`Return:` list of [Todos](/models/todo).

### `GET` /todo/current

Query Parameters

|Field|Type|Required|Description|
|-----|----|--------|-----------|
|date|string|True|Current date on the client in format `2020-01-20`|

`Return:` current [Todo](/models/todo), count of today's todos, and count of today's incomlete todos.

### `POST` /todo/:id/done

Marks todo as done

Body Parameters

|Field|Type|Required|Description|
|-----|----|--------|-----------|
|id|ObjectId|True|ID of the todo to mark done|

### `POST` /todo/:id/undone

Marks todo as not done

Body Parameters

|Field|Type|Required|Description|
|-----|----|--------|-----------|
|id|ObjectId|True|ID of the todo to mark not done|

### `DELETE` /todo/:id

Deletes a todo.

Body Parameters

|Field|Type|Required|Description|
|-----|----|--------|-----------|
|id|ObjectId|True|ID of the todo to delete|

### `POST` /todo/:id/skip

Skips todo.

Body Parameters

|Field|Type|Required|Description|
|-----|----|--------|-----------|
|id|ObjectId|True|ID of the todo to skip|

### `POST` /todo/rearrange

A map of todo date (e.g. `2020-01`, `2020-01-01`) to the list of todos.

Body Parameters

|Field|Type|Required|Description|
|-----|----|--------|-----------|
|todos|string: [Todo](/models/todo)[]]|Yes|rearranged todo map|
|today|string|Yes|today's date in the format `2020-12-17`|


## /subscription

### `GET` /subscription/session/:plan

Get a session for stripe.

Query Parameters

|Field|Type|Required|Description|
|-----|----|--------|-----------|
|plan|string|True|`monthly` or `yearly`|

### `POST` /subscription/cancel

Cancel stripe subscription.

## /settings

### `POST` /settings

Set settings.

Body Parameters

|Field|Type|Required|Description|
|-----|----|--------|-----------|
|showTodayOnAddTodo|bool|False|Whether to show today date as default on the todo screen or not|
|firstDayOfWeek|int|False|First day of the week where Sunday is 0|
|showTodayOnAddTodo|bool|False|Whether to put new todos on top of the list or on the bottom|


## /report

### `GET` /report

Method to get current report.

Query Parameters

|Field|Type|Required|Description|
|-----|----|--------|-----------|
|hash|string|False|Hashtag to filter tasks|
|startDate|Date|False|Report period start date|
|endDate|Date|False|Report period end date|

### /share

Method to share a snapshot of a specific report with other people.

Body Parameters

|Field|Type|Required|Description|
|-----|----|--------|-----------|
|hash|string|False|Hashtag to filter tasks|
|startDate|Date|False|Report period start date|
|endDate|Date|False|Report period end date|