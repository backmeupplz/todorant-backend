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
})
