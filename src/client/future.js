// wiki-plugin-new — future-ghost takeover
//
// Supersedes the renderer of the built-in `future` item — the "We could not
// find this page" ghost wiki-client builds for a missing page. The bundle
// preloads window.plugins.future and plugin.get() short-circuits on that map,
// so a plugin literally NAMED future can never load; the supported override is
// reassigning window.plugins.future at runtime from a client script that is
// already loaded. This plugin's factory.json carries "editor": true precisely
// so preLoadEditors imports us at startup.
//
// The replacement delegates to the SAVED ORIGINAL emit/bind — the create
// button (a delegated legacy.js handler keyed on unchanged markup), template
// offers, transporter and neighborhood-duplicate references all keep working —
// then appends an "edge" section: pages LIKE the missing one, seeded by its
// title through the similarity plugin's report route, plus one-click farm and
// federation report ghosts. On a farm without the similarity server the probe
// fails once and the ghost passes through untouched.
//
// Because preLoadEditors is async, the first lineup can render future items
// before this script installs — sweep() retro-fits those. attachEdge is
// idempotent (marker class), so install-then-sweep never double-renders.

const INLINE_LIMIT = 5
const REPORT_LIMIT = 20

let original = null       // the bundled future plugin, saved at install
let simProbe = null       // Promise<boolean> — similarity server present?

const probeSimilarity = () => {
  if (!simProbe) {
    simProbe = fetch('/system/similarity-health.json')
      .then(r => r.ok).catch(() => false)
  }
  return simProbe
}

const EDGE_CSS = `
<style id="wiki-new-edge-styles">
.new-edge { margin-top: 10px; border-top: 1px solid #e5e5e5; padding-top: 6px; }
.new-edge-status { font-size: 12px; color: #888; margin: 8px 0 4px; }
.new-edge-list a { display: block; font-size: 14px; color: #406; padding: 2px 0;
                   text-decoration: none; }
.new-edge-list img { width: 16px; height: 16px; vertical-align: middle;
                     margin-right: 6px; }
.new-edge-form { margin: 12px 0 0; display: flex; gap: 6px; flex-wrap: wrap; }
.new-edge-form input { flex: 1; min-width: 10em; padding: 4px 8px; font-size: 13px;
  border: 1px solid #ccc; border-radius: 3px; }
.new-edge-form button { padding: 4px 12px; background: #eee;
  border: 1px solid #bbb; border-radius: 3px; cursor: pointer; font-size: 13px; }
.new-edge-form button:hover { background: #e0e0e8; }
</style>`

const injectCss = () => {
  if (!document.getElementById('wiki-new-edge-styles'))
    document.head.insertAdjacentHTML('beforeend', EDGE_CSS)
}

const postReport = async body => {
  const res = await fetch('/system/search-report.json', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`search failed: ${res.status}`)
  return res.json()
}

// The missing page's title: the future item carries it; swept items fall back
// to the host page's raw data or its slug.
const titleFor = ($item, item) => {
  if (item && item.title) return item.title
  const $page = $item.parents('.page:first')
  return ($page.data('data') || {}).title || $page.attr('id') || ''
}

const attachEdge = ($item, item) => {
  if ($item.hasClass('new-edge-attached')) return
  $item.addClass('new-edge-attached')
  const title = titleFor($item, item)
  if (!title) return
  injectCss()

  ;(async () => {
    if (!(await probeSimilarity())) return  // plain fedwiki farm — pass through

    $item.append(`
      <div class="new-edge">
        <p class="new-edge-status new-edge-twins-status">Looking for this title on the farm…</p>
        <div class="new-edge-list new-edge-twins"></div>
        <p class="new-edge-status new-edge-sim-status">Searching for pages like this…</p>
        <div class="new-edge-list new-edge-sim"></div>
        <p class="new-edge-status new-edge-form-status">Search the federation for this title — edit the words, then choose a reach:</p>
        <p class="new-edge-form">
          <input class="new-edge-q" type="text">
          <button class="new-edge-farm">Search farm</button>
          <button class="new-edge-federation">Search federation</button>
        </p>
      </div>`)
    const $page = $item.parents('.page:first')
    $item.find('.new-edge-q').val(title)   // .val(), not markup — titles carry quotes

    // A flag+title link list, lineup-opening on click.
    const fillList = ($list, entries) => {
      $list.html(entries.map(r =>
        `<a href="#" data-title="${r.title}" data-site="${r.site}">` +
        `<img src="${window.wiki.site(r.site).flag()}" title="${r.site}"> ${r.title}</a>`
      ).join(''))
      $list.find('a').on('click', function (e) {
        e.preventDefault()
        e.stopPropagation()   // keep legacy handlers off a ghost-page link
        const $a = $(this)
        window.wiki.doInternalLink($a.data('title'),
          e.shiftKey ? null : $page, $a.data('site'))
      })
    }

    // 1. Same title on the farm — an existence scan, not a ranked search:
    //    a fork carries the same slug by definition, and the missing page's
    //    own slug is the page div's id. The route reads each site's sitemap.
    const twinStatus = $item.find('.new-edge-twins-status')
    try {
      const slug = ($page.attr('id') || '').split('_rev')[0]
      const res = await fetch('/system/title-twins.json?slug=' + encodeURIComponent(slug) +
        '&limit=' + INLINE_LIMIT)
      if (!res.ok) throw new Error(`title-twins failed: ${res.status}`)
      const twins = (await res.json()).map(r => ({ site: r.domain, title: r.title }))
      if (!twins.length) {
        twinStatus.text('No page with this title anywhere on the farm.')
      } else {
        twinStatus.text('This title, elsewhere on the farm:')
        fillList($item.find('.new-edge-twins'), twins)
      }
    } catch (e) {
      twinStatus.text(`Title search unavailable: ${e.message}`)
    }

    // 2. Nearest pages by meaning to the missing title.
    const simStatus = $item.find('.new-edge-sim-status')
    try {
      const page = await postReport({ query: title, domains: ['*'], limit: INLINE_LIMIT })
      const refs = (page.story || []).filter(i => i.type === 'reference')
      if (!refs.length) {
        simStatus.text('No pages like this found on the farm.')
      } else {
        simStatus.text('Pages like this, elsewhere:')
        fillList($item.find('.new-edge-sim'),
          refs.map(r => ({ site: r.site, title: r.title })))
      }
    } catch (e) {
      simStatus.text(`Similarity search unavailable: ${e.message}`)
    }

    // 3. The form — prefilled with the title, NEVER auto-run. The buttons
    //    mean what they say: farm = this farm's indexes ('*'); federation =
    //    ONLY the off-farm sites in the galaxy cache (GALAXY), no farm
    //    results mixed in. Enter defaults to the farm. Result is a report
    //    ghost either way.
    const formStatus = $item.find('.new-edge-form-status')
    const doReport = async domains => {
      const q = $item.find('.new-edge-q').val().trim()
      if (!q) return
      formStatus.text('Generating report…')
      try {
        const page = await postReport({ query: q, domains, limit: REPORT_LIMIT })
        window.wiki.showResult(window.wiki.newPage(page), { $page })
        formStatus.text('Search the federation for this title — edit the words, then choose a reach:')
      } catch (e) {
        formStatus.text(`Report failed: ${e.message}`)
      }
    }
    $item.find('.new-edge-farm').on('click', () => doReport(['*']))
    $item.find('.new-edge-federation').on('click', () => doReport(['GALAXY']))
    $item.find('.new-edge-q').on('keydown', e => {
      if (e.key === 'Enter') doReport(['*'])
    })
  })()
}

// Replacement plugin object. wrap() never runs on direct assignments, so both
// halves guard themselves and fall back to the original on any failure.
const emit = ($item, item) => {
  try { original.emit($item, item) }
  catch (err) { $item.append(`<p class="error">${err}</p>`) }
}

const bind = ($item, item) => {
  try { original.bind($item, item) } catch { /* original bind is transport-only */ }
  try { attachEdge($item, item) } catch { /* edge section is best-effort */ }
}

// Retro-fit future items that rendered before this script installed.
const sweep = () => {
  try {
    $('.item.future').each(function () {
      attachEdge($(this), $(this).data('item') || null)
    })
  } catch { /* nothing to sweep */ }
}

export const installFutureTakeover = () => {
  if (typeof window === 'undefined') return
  const tryInstall = () => {
    if (!window.plugins || !window.plugins.future || !window.$) return false
    if (window.plugins.future.newTakeover) return true
    original = window.plugins.future
    window.plugins.future = { emit, bind, newTakeover: true }
    sweep()
    return true
  }
  // preLoadEditors imports us after the bundle has set window.plugins, but
  // poll briefly in case load order ever shifts.
  if (!tryInstall()) {
    const timer = setInterval(() => { if (tryInstall()) clearInterval(timer) }, 200)
    setTimeout(() => clearInterval(timer), 10_000)
  }
}
