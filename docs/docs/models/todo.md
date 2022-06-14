# Todo model

| Field        | Type   | Description                                                |
| ------------ | ------ | ---------------------------------------------------------- |
| \_id         | string | Database ID (optional when creating a todo)                |
| text         | string | Todo's content                                             |
| completed    | bool   | Whether the todo is completed                              |
| frog         | bool   | Whether the todo is a frog                                 |
| frogFails    | int    | int of times frog was failed                               |
| skipped      | bool   | Whether this task was skipped                              |
| order        | int    | Task order within this day                                 |
| monthAndYear | string | Assigned month and year in the format "2019-01"            |
| date         | string | _Optional._ Assigned date in the format "01"               |
| time         | string | _Optional._ Exact time in the format "23:01"               |
| goFirst      | bool   | _Optional._ Overwriting the user setting when adding todos |
