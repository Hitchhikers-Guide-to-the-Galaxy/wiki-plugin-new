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
const SCAFFOLD_REFS = 12      // reference items gathered for a created page
const SCAFFOLD_SEE = 8        // local similar pages offered as [[wikilinks]]
const AUTHOR_API = '//api.localhost'

let authorProbe = null    // Promise<boolean> — farm API author route present?

const probeAuthor = () => {
  if (!authorProbe) {
    authorProbe = fetch(`${AUTHOR_API}/author/health`)
      .then(r => r.ok).catch(() => false)
  }
  return authorProbe
}

const newId = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(8)))
    .map(b => b.toString(16).padStart(2, '0')).join('')

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
.new-voice-note { font-size: 12px; color: #888; align-self: center; }
.new-edge-context { width: 100%; box-sizing: border-box; margin-top: 8px;
  padding: 4px 8px; font-size: 13px; font-family: inherit;
  border: 1px solid #ccc; border-radius: 3px; }
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

// A slug-shaped title becomes a real one: "galaxy-search-onboarding" →
// "Galaxy Search Onboarding". Small words stay lowercase except up front.
const SMALL_WORDS = new Set(['a', 'an', 'and', 'as', 'at', 'by', 'for', 'in',
  'of', 'on', 'or', 'the', 'to', 'vs', 'with'])

const deslug = slug =>
  slug.split('-').map((w, i) =>
    (i > 0 && SMALL_WORDS.has(w)) ? w
      : w.charAt(0).toUpperCase() + w.slice(1)
  ).join(' ')

// The missing page's title: the future item carries it; swept items fall back
// to the host page's raw data or its slug. A page reached by its /view/ URL
// arrives with the slug AS the title — de-slug it so searches read naturally
// and a created page is not stuck with a hyphenated lowercase title.
const titleFor = ($item, item) => {
  const title = (item && item.title) ||
    ($item.parents('.page:first').data('data') || {}).title ||
    $item.parents('.page:first').attr('id') || ''
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(title) ? deslug(title) : title
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

    attachCreate($item, $page, title)
  })()
}

// ── Creating the page ────────────────────────────────────────────────────────
//
// Two richer alternatives to the original "create new blank page": a scaffold
// of everything the edge section knows (factory + # See + # Reference +
// # Search), and the same scaffold opened with AI-authored prose from the
// farm API. Both end in a real create action PUT — the server appends the
// journal entry and updates sitemap and site-index itself — then a reload,
// which rebuilds the ghost panel as the real page.

// Pack titles into # See bullets: comma + "and" joins, no Oxford comma,
// ~50 visible characters per line (the fedwiki-see-section convention).
const seeLines = titles => {
  const groups = []
  let group = []
  let width = 0
  for (const t of titles) {
    if (group.length && width + t.length + 2 > 50) {
      groups.push(group)
      group = []
      width = 0
    }
    group.push(t)
    width += t.length + 2
  }
  if (group.length) groups.push(group)
  return groups.map(g => {
    const links = g.map(t => `[[${t}]]`)
    return '- ' + (links.length > 1
      ? links.slice(0, -1).join(', ') + ' and ' + links[links.length - 1]
      : links[0])
  })
}

const shorten = (text, max = 60) => {
  const t = (text || '')
    .replace(/\[\[([^\]]*)\]\]/g, '$1')        // wikilinks → their titles
    .replace(/\[(\S+) ([^\]]+)\]/g, '$2')      // external links → their labels
    .replace(/[*_`>#]/g, '')                   // emphasis and quote markup
    .replace(/\s+/g, ' ').trim()
  if (t.length <= max) return t
  return t.slice(0, max).replace(/\s+\S*$/, '') + '…'
}

// Everything the scaffold needs, fetched fresh at click time: same-title
// twins, farm-wide similar pages (references), same-site similar pages
// (see links).
const gatherScaffold = async (slug, title) => {
  const twins = await fetch('/system/title-twins.json?slug=' + encodeURIComponent(slug) +
    '&limit=' + SCAFFOLD_REFS).then(r => r.ok ? r.json() : []).catch(() => [])
  const farm = await postReport({ query: title, domains: ['*'], limit: SCAFFOLD_REFS })
    .catch(() => ({ story: [] }))
  const local = await postReport({ query: title, domains: [location.host], limit: SCAFFOLD_SEE })
    .catch(() => ({ story: [] }))

  const refs = []
  const seen = new Set()
  for (const t of twins) {
    if (t.domain === location.host) continue
    seen.add(`${t.domain}/${slug}`)
    refs.push({ site: t.domain, slug, title: t.title, text: 'twin of this title' })
  }
  for (const r of (farm.story || []).filter(i => i.type === 'reference')) {
    if (r.site === location.host) continue
    if (seen.has(`${r.site}/${r.slug}`)) continue
    seen.add(`${r.site}/${r.slug}`)
    refs.push({ site: r.site, slug: r.slug, title: r.title, text: shorten(r.text) })
  }
  const localTitles = (local.story || [])
    .filter(i => i.type === 'reference' && i.title !== title)
    .map(i => i.title)
  return { refs: refs.slice(0, SCAFFOLD_REFS), localTitles }
}

// The created page's story: optional prose, optional factory, then the
// # See / # Reference / # Search sections in the house order.
const buildScaffold = ({ prose = [], withFactory, localTitles, refs, stub }) => {
  const story = []
  for (const p of prose) story.push({ type: 'markdown', id: newId(), text: p })
  if (withFactory) story.push({ type: 'factory', id: newId() })
  const lines = seeLines(localTitles)
  if (stub) lines.unshift('- [[Stub]]')
  if (lines.length)
    story.push({ type: 'markdown', id: newId(), text: '# See\n\n' + lines.join('\n') })
  if (refs.length) {
    story.push({ type: 'markdown', id: newId(), text: '# Reference' })
    for (const r of refs)
      story.push({ type: 'reference', id: newId(),
        site: r.site, slug: r.slug, title: r.title, text: r.text })
  }
  story.push({ type: 'markdown', id: newId(), text: '# Search' })
  story.push({ type: 'similarity', id: newId(), text: '*\nGALAXY' })
  return story
}

const putCreate = async (slug, title, story, provenance) => {
  const action = { type: 'create', id: newId(), date: Date.now(),
    item: { title, story }, provenance }
  const res = await fetch(`/page/${slug}/action`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'action=' + encodeURIComponent(JSON.stringify(action)),
  })
  if (res.status === 409) return    // someone beat us to it — the reload shows it
  if (res.status === 403 || res.status === 401)
    throw new Error('not authorized — log in as the site owner first')
  if (!res.ok) throw new Error(`create failed: ${res.status}`)
}

const attachCreate = ($item, $page, title) => {
  const slug = ($page.attr('id') || '').split('_rev')[0]
  if (!slug) return

  $item.find('.new-edge').append(`
    <p class="new-edge-status">Or create this page now:</p>
    <p class="new-edge-form">
      <button class="new-edge-create">Create page with links</button>
    </p>
    <span class="new-edge-authoring" style="display:none">
      <textarea class="new-edge-context" rows="3"
        placeholder="Ideas or context to inform the authored content (optional)"></textarea>
      <p class="new-edge-form">
        <button class="new-edge-author">Author page with content</button>
      </p>
    </span>
    <p class="new-edge-status new-edge-create-msg"></p>`)

  const msg = $item.find('.new-edge-create-msg')
  const busy = state => {
    $item.find('.new-edge-create, .new-edge-author').prop('disabled', state)
  }

  probeAuthor().then(ok => {
    if (ok) $item.find('.new-edge-authoring').show()
  })

  // Scaffold create: links only, factory on top for the content to come.
  $item.find('.new-edge-create').on('click', async () => {
    busy(true)
    msg.text('Gathering links…')
    try {
      const { refs, localTitles } = await gatherScaffold(slug, title)
      const story = buildScaffold({ withFactory: true, localTitles, refs })
      msg.text('Creating page…')
      await putCreate(slug, title, story,
        'Created with links from the future ghost by wiki-plugin-new.')
      location.reload()
    } catch (e) {
      msg.text(`Create failed: ${e.message}`)
      busy(false)
    }
  })

  // AI authoring: the farm API runs a headless Claude job over the gathered
  // context; we poll until the prose arrives, then create the same scaffold
  // with the prose on top (no factory — the content is the point).
  $item.find('.new-edge-author').on('click', async () => {
    busy(true)
    msg.text('Gathering links…')
    try {
      const { refs, localTitles } = await gatherScaffold(slug, title)
      const context = $item.find('.new-edge-context').val().trim()
      msg.text('Starting the author…')
      const start = await fetch(`${AUTHOR_API}/author/page`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, context, domain: location.host,
          see: localTitles, references: refs }),
      })
      if (!start.ok) throw new Error(`author start failed: ${start.status}`)
      const { job } = await start.json()
      const t0 = Date.now()
      let result
      for (;;) {
        await new Promise(r => setTimeout(r, 3000))
        const res = await fetch(`${AUTHOR_API}/author/page/${job}`)
        if (!res.ok) throw new Error(`author poll failed: ${res.status}`)
        result = await res.json()
        if (result.status === 'done') break
        if (result.status === 'error') throw new Error(result.error)
        msg.text(`Authoring… ${Math.round((Date.now() - t0) / 1000)}s ` +
          '(a thoughtful page takes a minute or three)')
      }
      const story = buildScaffold({ prose: result.paragraphs,
        localTitles, refs, stub: result.stub })
      msg.text('Creating page…')
      await putCreate(slug, title, story,
        'AI authored from the future ghost by wiki-plugin-new via the Claude CLI' +
        (context ? '; context notes by the site owner.' : '.'))
      location.reload()
    } catch (e) {
      msg.text(`Author failed: ${e.message}`)
      busy(false)
    }
  })
}

// ── Speaking the page ────────────────────────────────────────────────────────
//
// Where the farm runs the audionote plugin, the ghost offers its Voice Tool,
// titled with the missing page's name. The tool opens as a ghost of the site's
// own Voice Tool page with a TITLE: line added to its audionote item, so no
// change to audionote is needed. The tool looks past ghosts for its subject,
// which makes it the page holding the red link: saving under the title turns
// that link blue instead of adding a new one.

let voiceProbe = null     // Promise<page|null> — the Voice Tool, if installed

const probeVoice = () => {
  if (!voiceProbe) {
    voiceProbe = (async () => {
      // The farm must RUN audionote's server side, not merely ship its client:
      // sweet-server lists every vendored plugin but mounts none of their
      // routes, so ask the farm API whether the transcription op is mounted.
      const api = await fetch('/system/api.json').then(r => r.ok ? r.json() : {})
      if (!api.paths?.['/system/api/audionote/hear.json']) return null
      const page = await fetch('/voice-tool.json').then(r => r.ok ? r.json() : null)
      const tool = (page?.story || []).find(i =>
        i.type === 'audionote' && /^SUBJECT\s*$/m.test(i.text || ''))
      return tool ? page : null
    })().catch(() => null)
  }
  return voiceProbe
}

// One item id per missing page, so the tool's unsaved draft (kept in the
// browser under that id) comes back when the same ghost is spoken to again.
const idFor = async key => {
  const digest = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(key))
  return Array.from(new Uint8Array(digest).slice(0, 8))
    .map(b => b.toString(16).padStart(2, '0')).join('')
}

const voiceToolFor = async (page, slug, title) => {
  const id = await idFor(`${location.host}/${slug}`)
  const story = page.story.map(i => {
    if (i.type !== 'audionote' || !/^SUBJECT\s*$/m.test(i.text || '')) return { ...i }
    const lines = i.text.split('\n').filter(l => !/^\s*TITLE:/.test(l))
    return { ...i, id, text: [...lines, `TITLE: ${title}`].join('\n') }
  })
  return { title: page.title, story }
}

const attachVoice = ($item, item) => {
  if ($item.hasClass('new-voice-attached')) return
  $item.addClass('new-voice-attached')
  const title = titleFor($item, item)
  const $page = $item.parents('.page:first')
  const slug = ($page.attr('id') || '').split('_rev')[0]
  if (!title || !slug) return
  injectCss()
  // A placeholder now, so the option sits above the edge section however
  // the two probes race; it shows only once the Voice Tool is found.
  const $voice = $(`
    <div class="new-voice" style="display:none">
      <p class="new-edge-form">
        <button class="new-voice-speak" title="Open the Voice Tool beside this page, titled with its name — speak, summarise, and save the notes as this page">🎙 Speak this page</button>
      </p>
    </div>`).appendTo($item)

  ;(async () => {
    const page = await probeVoice()
    if (!page) return
    $voice.show()
    if (window.isOwner === false) {   // the farm transcribes only for the owner: offer it, and say why it waits
      $voice.find('.new-voice-speak').prop('disabled', true)
      $voice.find('.new-edge-form').append(' <span class="new-voice-note">log in as the owner of this site to speak this page</span>')
      return
    }
    $voice.find('.new-voice-speak').on('click', async e => {
      e.preventDefault()
      e.stopPropagation()
      const tool = await voiceToolFor(page, slug, title)
      window.wiki.showResult(window.wiki.newPage(tool), { $page })
    })
  })()
}

// Replacement plugin object. wrap() never runs on direct assignments, so both
// halves guard themselves and fall back to the original on any failure.
const emit = ($item, item) => {
  // wiki-client 0.32 reads wiki.neighborhood[site].lastModified for every
  // site in item.context, and throws when a site has been dropped from the
  // neighborhood. Hand it only the sites the neighborhood still knows.
  const known = item?.context?.filter(site => window.wiki?.neighborhood?.[site])
  if (known && known.length !== item.context.length) item = { ...item, context: known }
  try { original.emit($item, item) }
  catch (err) { $item.append(`<p class="error">${err}</p>`) }
}

const bind = ($item, item) => {
  try { original.bind($item, item) } catch { /* original bind is transport-only */ }
  try { attachVoice($item, item) } catch { /* voice option is best-effort */ }
  try { attachEdge($item, item) } catch { /* edge section is best-effort */ }
}

// Retro-fit future items that rendered before this script installed.
const sweep = () => {
  try {
    $('.item.future').each(function () {
      attachVoice($(this), $(this).data('item') || null)
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
