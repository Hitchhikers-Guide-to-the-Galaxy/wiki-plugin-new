import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { parseDSL, filterCatalog, LEVELS } from '../src/client/new.js'

describe('parseDSL', () => {
  it('parses LEVEL blocks with plugin names', () => {
    const text = `LEVEL NUBE\nParagraph\nMarkdown\n\nLEVEL GEEK\nALL`
    const { levels, hide } = parseDSL(text)
    assert.deepEqual(levels.NUBE, ['Paragraph', 'Markdown'])
    assert.equal(levels.GEEK, 'ALL')
    assert.deepEqual(hide, [])
  })

  it('parses HIDE block', () => {
    const text = `LEVEL NUBE\nParagraph\n\nHIDE\nMath\nTransport`
    const { levels, hide } = parseDSL(text)
    assert.deepEqual(levels.NUBE, ['Paragraph'])
    assert.deepEqual(hide, ['Math', 'Transport'])
  })

  it('ALL inside a level means all plugins', () => {
    const { levels } = parseDSL('LEVEL EXPERT\nALL')
    assert.equal(levels.EXPERT, 'ALL')
  })

  it('skips blank lines and comment lines', () => {
    const text = `// a comment\n\nLEVEL AUTHOR\n// another\nCode\n`
    const { levels } = parseDSL(text)
    assert.deepEqual(levels.AUTHOR, ['Code'])
  })

  it('is case-insensitive for keywords', () => {
    const { levels, hide } = parseDSL('level nube\nParagraph\nhide\nMath')
    assert.deepEqual(levels.NUBE, ['Paragraph'])
    assert.deepEqual(hide, ['Math'])
  })

  it('returns empty config for empty text', () => {
    const { levels, hide } = parseDSL('')
    assert.deepEqual(hide, [])
    assert.deepEqual(Object.keys(levels).length === 0, true)
  })
})

describe('filterCatalog', () => {
  const catalog = [
    { name: 'Paragraph' },
    { name: 'Markdown' },
    { name: 'Math' },
    { name: 'Transport' },
    { name: 'Date' },
    { name: 'Timeline' },
  ]

  it('filters to allowed list for a LEVEL', () => {
    const config = parseDSL('LEVEL NUBE\nParagraph\nMarkdown')
    const result = filterCatalog(catalog, config, 'NUBE')
    assert.deepEqual(result.map(e => e.name), ['Paragraph', 'Markdown'])
  })

  it('ALL level returns everything (minus HIDE)', () => {
    const config = parseDSL('LEVEL GEEK\nALL\n\nHIDE\nMath')
    const result = filterCatalog(catalog, config, 'GEEK')
    assert.ok(!result.find(e => e.name === 'Math'))
    assert.ok(result.find(e => e.name === 'Timeline'))
  })

  it('HIDE applies to all levels', () => {
    const config = parseDSL('LEVEL EXPERT\nALL\n\nHIDE\nTransport\nMath')
    const result = filterCatalog(catalog, config, 'EXPERT')
    assert.ok(!result.find(e => e.name === 'Transport'))
    assert.ok(!result.find(e => e.name === 'Math'))
  })

  it('returns raw catalog when config is null', () => {
    const result = filterCatalog(catalog, null, 'NUBE')
    assert.equal(result, catalog)
  })

  it('is case-insensitive for plugin names', () => {
    const config = parseDSL('LEVEL NUBE\nparagraph\nmarkdown')
    const result = filterCatalog(catalog, config, 'NUBE')
    assert.deepEqual(result.map(e => e.name), ['Paragraph', 'Markdown'])
  })

  it('unknown level falls back to pass-through (returns full catalog minus HIDE)', () => {
    const config = parseDSL('LEVEL NUBE\nParagraph\n\nHIDE\nMath')
    const result = filterCatalog(catalog, config, 'AUTHOR')
    assert.ok(!result.find(e => e.name === 'Math'), 'HIDE still applies')
    assert.ok(result.find(e => e.name === 'Timeline'), 'unlisted plugins still shown')
  })
})

describe('LEVELS', () => {
  it('exports the four canonical level names', () => {
    assert.deepEqual(LEVELS, ['NUBE', 'AUTHOR', 'EXPERT', 'GEEK'])
  })
})
