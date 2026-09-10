import { describe, expect, it } from 'vitest'
import { parseScopeList } from './scopeParser'

describe('parseScopeList', () => {
  it('parses comma-separated scopes', () => {
    expect(parseScopeList('oob, prelogin')).toEqual(['oob', 'prelogin'])
  })

  it('parses line-separated scopes', () => {
    expect(parseScopeList('oob\nprelogin')).toEqual(['oob', 'prelogin'])
  })

  it('treats "-" as no scope', () => {
    expect(parseScopeList('-')).toEqual([])
  })

  it('treats "none" as no scope', () => {
    expect(parseScopeList('none')).toEqual([])
  })

  it('treats empty/undefined as no scope', () => {
    expect(parseScopeList('')).toEqual([])
    expect(parseScopeList(undefined)).toEqual([])
    expect(parseScopeList(null)).toEqual([])
  })

  it('trims whitespace around each scope', () => {
    expect(parseScopeList('  oob ,  prelogin  ')).toEqual(['oob', 'prelogin'])
  })
})
