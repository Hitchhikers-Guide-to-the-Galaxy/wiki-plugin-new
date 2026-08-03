// wiki-plugin-new
//
// Controls window.catalog — the global array wiki-client's factory.js uses to
// populate the plugin picker.  Intercepts the assignment via Object.defineProperty
// so the filter applies whether the new item appears before or after a factory
// item on the page.
//
// DSL (stored in item.text):
//
//   LEVEL NUBE          ← start a named level block
//   Paragraph           ← plugin name (matches factory.json "name", case-insensitive)
//   Markdown
//
//   LEVEL GEEK          ← use ALL to mean "every installed plugin"
//   ALL
//
//   HIDE                ← global exclude list, applied to every level
//   Math
//   Transport

import { installFutureTakeover } from './future.js'

// ── DSL Parser ────────────────────────────────────────────────────────────────

export const LEVELS = ['NUBE', 'AUTHOR', 'EXPERT', 'GEEK']
const STORAGE_KEY = 'wiki-new'

export const FACTORY_STYLES = ['classic', 'list', 'rollover']

export const parseDSL = text => {
  const levels = {}
  const hide   = []
  let factory  = null   // FACTORY classic|list|rollover — factory display style
  let section  = null   // 'HIDE' | level name

  for (const raw of (text || '').split('\n')) {
    const line = raw.trim()
    if (!line || line.startsWith('//')) continue

    // FACTORY <style> — which skin the factory item renders with
    const factoryMatch = line.match(/^FACTORY\s+(\S+)$/i)
    if (factoryMatch) {
      const style = factoryMatch[1].toLowerCase()
      if (FACTORY_STYLES.includes(style)) factory = style
      continue
    }

    // LEVEL <NAME>
    const levelMatch = line.match(/^LEVEL\s+(\S+)$/i)
    if (levelMatch) {
      section = levelMatch[1].toUpperCase()
      if (!levels[section]) levels[section] = []
      continue
    }

    // HIDE block header
    if (line.toUpperCase() === 'HIDE') {
      section = 'HIDE'
      continue
    }

    // ALL keyword inside a LEVEL block
    if (line.toUpperCase() === 'ALL' && section && section !== 'HIDE') {
      levels[section] = 'ALL'
      continue
    }

    // Plugin name in current section
    if (section === 'HIDE') {
      hide.push(line)
    } else if (section) {
      if (!Array.isArray(levels[section])) levels[section] = []
      if (!levels[section].includes(line)) levels[section].push(line)
    }
  }

  return { levels, hide, factory }
}

// ── Filter logic ──────────────────────────────────────────────────────────────

export const filterCatalog = (raw, config, level) => {
  if (!config || !raw) return raw
  const { levels, hide } = config

  const hideSet = new Set((hide || []).map(n => n.toLowerCase()))
  const allowed = levels && levels[level]

  return raw.filter(entry => {
    if (!entry || !entry.name) return false
    const name = entry.name.toLowerCase()
    if (hideSet.has(name)) return false
    if (!allowed || allowed === 'ALL') return true
    return allowed.map(n => n.toLowerCase()).includes(name)
  })
}

// ── Global interceptor — runs at IIFE time ────────────────────────────────────
// Object.defineProperty fires before any page item renders, so it catches the
// window.catalog = data assignment from wiki-client/lib/factory.js regardless
// of item order on the page.

let _interceptorCatalog = undefined
let _globalConfig  = null
let _globalLevel   = 'AUTHOR'
// Factory display style — 'classic' is the untouched default-wiki picker and
// the default here. 'list' (né 'chooser') and 'rollover' opt into the wiki-ux
// skins, which read this same storage record before rendering
// (client/wiki-ux.js factoryStyle). Legacy stored 'chooser' reads as 'list'.
let _globalFactory = 'classic'

const readStorage = () => {
  try {
    const s = localStorage.getItem(STORAGE_KEY)
    if (!s) return
    const d = JSON.parse(s)
    if (d.config) _globalConfig = d.config
    if (d.level && LEVELS.includes(d.level)) _globalLevel = d.level
    if (d.factory === 'chooser') _globalFactory = 'list'          // legacy name
    else if (FACTORY_STYLES.includes(d.factory)) _globalFactory = d.factory
  } catch {}
}

const writeStorage = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(
      { config: _globalConfig, level: _globalLevel, factory: _globalFactory }))
  } catch {}
}

const applyGlobalFilter = raw => filterCatalog(raw, _globalConfig, _globalLevel)

if (typeof window !== 'undefined' && window !== null) {
  readStorage()

  // If window.catalog is already set (rare, but possible), filter it now.
  if (window.catalog) {
    _interceptorCatalog = applyGlobalFilter(window.catalog)
  }

  Object.defineProperty(window, 'catalog', {
    get () { return _interceptorCatalog },
    set (val) { _interceptorCatalog = applyGlobalFilter(val) },
    configurable: true,
    enumerable: true,
  })
}

// ── Rendering ─────────────────────────────────────────────────────────────────

const LEVEL_LABELS = {
  NUBE:   { label: 'Nube',   hint: 'Newcomer — basic text, image, and video' },
  AUTHOR: { label: 'Author', hint: 'Content creator — adds structured data items' },
  EXPERT: { label: 'Expert', hint: 'Experienced — most plugins available' },
  GEEK:   { label: 'Geek',   hint: 'All plugins minus the hidden list' },
}

const renderLevel = (level, active) => {
  const { label, hint } = LEVEL_LABELS[level] || { label: level, hint: '' }
  const cls = level === active ? 'new-btn new-active' : 'new-btn'
  return `<button class="${cls}" data-level="${level}" title="${hint}">${label}</button>`
}

const renderPluginList = (config, level) => {
  if (!window.catalog) return '<em>plugin list not loaded yet</em>'
  const filtered = filterCatalog(window.catalog, config, level)
  if (!filtered || !filtered.length) return '<em>no plugins at this level</em>'
  return filtered.map(e => `<span class="new-pill">${e.name}</span>`).join(' ')
}

const FACTORY_LABELS = {
  classic:  { label: 'Classic',  hint: 'The default wiki factory — untouched' },
  list:     { label: 'List',     hint: 'Searchable list — each plugin with a short summary' },
  rollover: { label: 'Rollover', hint: 'Tabbed pills — roll over for what each plugin does' },
}

const renderFactoryRow = active =>
  '<span class="new-factory-label">Factory style</span> ' +
  FACTORY_STYLES.map(s => {
    const { label, hint } = FACTORY_LABELS[s]
    const cls = s === active ? 'new-btn new-active' : 'new-btn'
    return `<button class="${cls} new-fbtn" data-factory="${s}" title="${hint}">${label}</button>`
  }).join(' ')

// Repaint factory items already on screen so a style flip is instant. The
// emit wrapper (wiki-ux) reads the stored style, so plain re-emit is enough;
// items without a data('item') record are skipped and pick the style up on
// their next natural render.
const reEmitFactories = () => {
  try {
    $('.item.factory').each(function () {
      const $i = $(this)
      const it = $i.data('item')
      if (it && it.type === 'factory') {
        $i.empty()
        window.plugins.factory.emit($i, it)
      }
    })
  } catch { /* no factories on screen */ }
}

const CSS = `
<style id="wiki-new-styles">
.wiki-plugin-new {
  padding: .5em .8em;
  background: #f4f4f8;
  border-left: 3px solid #888;
  font-family: sans-serif;
  font-size: .85em;
  margin-bottom: 6px;
}
.new-levels { margin-bottom: .5em; display: flex; gap: 4px; }
.new-btn {
  padding: .2em .7em; border: 1px solid #bbb; border-radius: 3px;
  background: #fff; cursor: pointer; font-size: .9em; color: #444;
}
.new-btn:hover { background: #e8e8f0; }
.new-active { background: #5b6fd9; color: #fff; border-color: #5b6fd9; font-weight: bold; }
.new-pill {
  display: inline-block; padding: .1em .4em;
  background: #dde; border-radius: 3px; margin: 2px 1px;
  font-size: .85em; color: #334;
}
.new-hint { color: #888; font-size: .8em; margin-top: .3em; }
.new-factory { margin-top: .5em; padding-top: .5em; border-top: 1px solid #ddd; }
.new-factory-label { color: #888; font-size: .85em; margin-right: .5em; }
</style>`

let cssInjected = false
const injectCSS = () => {
  if (cssInjected || !document.getElementById('wiki-new-styles')) {
    if (!cssInjected) {
      document.head.insertAdjacentHTML('beforeend', CSS)
      cssInjected = true
    }
  }
}

// ── emit ──────────────────────────────────────────────────────────────────────

export const emit = ($item, item) => {
  injectCSS()
  const config = parseDSL(item.text)
  const level  = _globalLevel

  const buttons = LEVELS.map(l => renderLevel(l, level)).join('')
  const hint    = LEVEL_LABELS[level]?.hint || ''

  $item.html(
    `<div class="wiki-plugin-new">` +
    `<div class="new-levels">${buttons}</div>` +
    `<div class="new-pills">${renderPluginList(config, level)}</div>` +
    `<div class="new-hint">${hint}</div>` +
    `<div class="new-factory">${renderFactoryRow(_globalFactory)}</div>` +
    `</div>`
  )
}

// ── bind ──────────────────────────────────────────────────────────────────────

export const bind = ($item, item) => {
  const config = parseDSL(item.text)

  // Update global config from this item's DSL and reapply. A FACTORY line in
  // the DSL pins the factory style; without one the user's stored choice
  // stands (default: classic).
  _globalConfig = config
  if (config.factory) _globalFactory = config.factory
  writeStorage()

  // Refilter window.catalog with the new config
  // Fetch fresh if not loaded yet, otherwise refilter in place
  if (!_interceptorCatalog) {
    // Catalog not loaded yet — will be filtered when factory.js fetches it
  } else {
    // Force a refilter: temporarily clear and reassign so our setter runs
    // We need the raw full list — refetch from server
    try {
      wiki.origin.get('system/factories.json', (err, data) => {
        if (!err) window.catalog = data  // setter filters it
        refreshUI($item, item, config)
      })
    } catch { refreshUI($item, item, config) }
  }

  refreshUI($item, item, config)

  // Level switcher
  $item.on('click', '.new-btn', function () {
    const newLevel = this.dataset.level
    if (!LEVELS.includes(newLevel)) return
    _globalLevel = newLevel
    writeStorage()

    // Force catalog refilter from server for clean slate
    try {
      wiki.origin.get('system/factories.json', (err, data) => {
        if (!err) window.catalog = data
        refreshUI($item, item, config)
      })
    } catch { refreshUI($item, item, config) }
  })

  // Factory style switcher — persists, repaints any factory items on screen
  $item.on('click', '.new-fbtn', function () {
    const style = this.dataset.factory
    if (!FACTORY_STYLES.includes(style)) return
    _globalFactory = style
    writeStorage()
    refreshUI($item, item, config)
    reEmitFactories()
  })

  // Double-click to edit
  $item.on('dblclick', () => wiki.textEditor($item, item))
}

const refreshUI = ($item, item, config) => {
  const level   = _globalLevel
  const buttons = LEVELS.map(l => renderLevel(l, level)).join('')
  const hint    = LEVEL_LABELS[level]?.hint || ''

  $item.find('.new-levels').html(buttons)
  $item.find('.new-pills').html(renderPluginList(config, level))
  $item.find('.new-hint').text(hint)
  $item.find('.new-factory').html(renderFactoryRow(_globalFactory))
}

// ── Register ──────────────────────────────────────────────────────────────────
// factory.json carries "editor": true so preLoadEditors imports this script at
// startup — that early load is what lets installFutureTakeover supersede the
// bundled future renderer before (or just after) the first lineup renders.
// The editor hook itself defers to the plain text editor.

if (typeof window !== 'undefined' && window !== null) {
  window.plugins = window.plugins || {}
  window.plugins['new'] = {
    emit, bind,
    editor: ($item, item) => window.wiki.textEditor($item, item),
  }
  installFutureTakeover()
}
