import { describe, expect, it } from 'vitest'
import { toCsv } from './csv'

describe('toCsv', () => {
  it('joins headers and rows with CRLF', () => {
    expect(toCsv(['a', 'b'], [[1, 2]])).toBe('a,b\r\n1,2')
  })

  it('quotes fields containing commas, quotes, or newlines', () => {
    const csv = toCsv(['note'], [['hello, "world"\nnext line']])
    expect(csv).toBe('note\r\n"hello, ""world""\nnext line"')
  })

  it('handles empty rows', () => {
    expect(toCsv(['a'], [])).toBe('a')
  })
})
