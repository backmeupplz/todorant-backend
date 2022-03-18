import { errors } from '@/helpers/errors'

describe('Errors helper', () => {
  it('Should return right string for each error', async () => {
    expect(errors.authentication).toBe(
      '{"en":"Authentication failed","ru":"Аутентификация провалилась"}'
    )
    expect(errors.facebookAlreadyConnected).toBe(
      '{"en":"Facebook is already connected","ru":"Фейсбук уже подключен"}'
    )
    expect(errors.googleAlreadyConnected).toBe(
      '{"en":"Google is already connected","ru":"Гугл уже подключен"}'
    )
    expect(errors.invalidFormat).toBe(
      '{"en":"Invalid format","ru":"Неправильный формат"}'
    )
    expect(errors.noTag).toBe(
      '{"en":"No hashtag found","ru":"Хештег не найден"}'
    )
    expect(errors.noTodo).toBe(
      '{"en":"No todo found","ru":"Задача не найдена"}'
    )
    expect(errors.noTokenProvided).toBe(
      '{"en":"No authentication token provided","ru":"Нет токена авторизации"}'
    )
    expect(errors.noUser).toBe(
      '{"en":"No user found","ru":"Пользователь не найден","fr":"User non trouvé"}'
    )
    expect(errors.subscription).toBe(
      '{"en":"You have to buy the subscription","ru":"Вам нужно приобрести подписку"}'
    )
    expect(errors.telegramAlreadyConnected).toBe(
      '{"en":"Telegram is already connected","ru":"Телеграм уже подключен"}'
    )
    expect(errors.wrongDecryptionPassword).toBe(
      '{"en":"Wrong decryption password","ru":"Неправильный пароль расшифровки"}'
    )
  })
})
