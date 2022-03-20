import { linkify } from '@/helpers/linkify'

describe('Linkify helper', () => {
  it('should find singular tags', async () => {
    expect(linkify.match('#test1')[0].url).toBe('#test1') // eng lowercase
    expect(linkify.match('#тест2')[0].url).toBe('#тест2') // rus lowercase
    expect(linkify.match('#TEST3')[0].url).toBe('#TEST3') // eng uppercase
    expect(linkify.match('#ТЕСТ4')[0].url).toBe('#ТЕСТ4') // rus uppercase
  })

  it('should find multiple tags', async () => {
    expect(
      linkify.match('#test1 #тест2 #TEST3 #ТЕСТ4').map((cur) => {
        return cur.url
      })
    ).toStrictEqual(['#test1', '#тест2', '#TEST3', '#ТЕСТ4'])
  })

  it('should find tag in sentence', async () => {
    expect(
      linkify.match('Здесь производится #teSтИnГ посреди сообщения')[0].url
    ).toBe('#teSтИnГ')
    expect(linkify.match('#teSтИnГ в начале сообщения')[0].url).toBe('#teSтИnГ')
    expect(
      linkify.match('В конце сообщения производится #teSтИnГ')[0].url
    ).toBe('#teSтИnГ')
  })

  it('should find multiple tags in sentence', async () => {
    expect(
      linkify.match('Здесь обитают #Test1 и #Test2').map((cur) => {
        return cur.url
      })
    ).toStrictEqual(['#Test1', '#Test2'])
    expect(
      linkify.match('Здесь обитают #Тест1 и #Тест2').map((cur) => {
        return cur.url
      })
    ).toStrictEqual(['#Тест1', '#Тест2'])
  })

  it('should find multiple of the same tags in sentence', async () => {
    expect(
      linkify.match('#Test is a #Test').map((cur) => {
        return [cur.url, cur.index]
      })
    ).toStrictEqual([
      ['#Test', 0],
      ['#Test', 11],
    ])
    expect(
      linkify.match('#Тест это #Тест').map((cur) => {
        return [cur.url, cur.index]
      })
    ).toStrictEqual([
      ['#Тест', 0],
      ['#Тест', 10],
    ])
  })

  it('should find multiple similar tags with different registers in sentence', async () => {
    expect(
      linkify
        .match('#Test is not a #tEst not a #tesT and not a #TEsT')
        .map((cur) => {
          return [cur.url, cur.index]
        })
    ).toStrictEqual([
      ['#Test', 0],
      ['#tEst', 15],
      ['#tesT', 27],
      ['#TEsT', 43],
    ])
    expect(
      linkify.match('#Тест это не #тЕст не #тесТ и не #ТЕсТ').map((cur) => {
        return [cur.url, cur.index]
      })
    ).toStrictEqual([
      ['#Тест', 0],
      ['#тЕст', 13],
      ['#тесТ', 22],
      ['#ТЕсТ', 33],
    ])
  })
})
