(()=>{var v=null,x=null,F=()=>(x||(x=fetch("/system/similarity-health.json").then(e=>e.ok).catch(()=>!1)),x),P=`
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
</style>`,U=()=>{document.getElementById("wiki-new-edge-styles")||document.head.insertAdjacentHTML("beforeend",P)},S=async e=>{let t=await fetch("/system/search-report.json",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)});if(!t.ok)throw new Error(`search failed: ${t.status}`);return t.json()},z=(e,t)=>{if(t&&t.title)return t.title;let n=e.parents(".page:first");return(n.data("data")||{}).title||n.attr("id")||""},I=(e,t)=>{if(e.hasClass("new-edge-attached"))return;e.addClass("new-edge-attached");let n=z(e,t);n&&(U(),(async()=>{if(!await F())return;e.append(`
      <div class="new-edge">
        <p class="new-edge-status new-edge-twins-status">Looking for this title on the farm\u2026</p>
        <div class="new-edge-list new-edge-twins"></div>
        <p class="new-edge-status new-edge-sim-status">Searching for pages like this\u2026</p>
        <div class="new-edge-list new-edge-sim"></div>
        <p class="new-edge-status new-edge-form-status">Search the federation for this title \u2014 edit the words, then choose a reach:</p>
        <p class="new-edge-form">
          <input class="new-edge-q" type="text">
          <button class="new-edge-farm">Search farm</button>
          <button class="new-edge-federation">Search federation</button>
        </p>
      </div>`);let i=e.parents(".page:first");e.find(".new-edge-q").val(n);let o=(r,d)=>{r.html(d.map(a=>`<a href="#" data-title="${a.title}" data-site="${a.site}"><img src="${window.wiki.site(a.site).flag()}" title="${a.site}"> ${a.title}</a>`).join("")),r.find("a").on("click",function(a){a.preventDefault(),a.stopPropagation();let g=$(this);window.wiki.doInternalLink(g.data("title"),a.shiftKey?null:i,g.data("site"))})},l=e.find(".new-edge-twins-status");try{let r=(i.attr("id")||"").split("_rev")[0],d=await fetch("/system/title-twins.json?slug="+encodeURIComponent(r)+"&limit=5");if(!d.ok)throw new Error(`title-twins failed: ${d.status}`);let a=(await d.json()).map(g=>({site:g.domain,title:g.title}));a.length?(l.text("This title, elsewhere on the farm:"),o(e.find(".new-edge-twins"),a)):l.text("No page with this title anywhere on the farm.")}catch(r){l.text(`Title search unavailable: ${r.message}`)}let s=e.find(".new-edge-sim-status");try{let d=((await S({query:n,domains:["*"],limit:5})).story||[]).filter(a=>a.type==="reference");d.length?(s.text("Pages like this, elsewhere:"),o(e.find(".new-edge-sim"),d.map(a=>({site:a.site,title:a.title})))):s.text("No pages like this found on the farm.")}catch(r){s.text(`Similarity search unavailable: ${r.message}`)}let c=e.find(".new-edge-form-status"),f=async r=>{let d=e.find(".new-edge-q").val().trim();if(d){c.text("Generating report\u2026");try{let a=await S({query:d,domains:r,limit:20});window.wiki.showResult(window.wiki.newPage(a),{$page:i}),c.text("Search the federation for this title \u2014 edit the words, then choose a reach:")}catch(a){c.text(`Report failed: ${a.message}`)}}};e.find(".new-edge-farm").on("click",()=>f(["*"])),e.find(".new-edge-federation").on("click",()=>f(["GALAXY"])),e.find(".new-edge-q").on("keydown",r=>{r.key==="Enter"&&f(["*"])})})())},H=(e,t)=>{try{v.emit(e,t)}catch(n){e.append(`<p class="error">${n}</p>`)}},M=(e,t)=>{try{v.bind(e,t)}catch{}try{I(e,t)}catch{}},G=()=>{try{$(".item.future").each(function(){I($(this),$(this).data("item")||null)})}catch{}},T=()=>{if(typeof window>"u")return;let e=()=>!window.plugins||!window.plugins.future||!window.$?!1:(window.plugins.future.newTakeover||(v=window.plugins.future,window.plugins.future={emit:H,bind:M,newTakeover:!0},G()),!0);if(!e()){let t=setInterval(()=>{e()&&clearInterval(t)},200);setTimeout(()=>clearInterval(t),1e4)}};var m=["NUBE","AUTHOR","EXPERT","GEEK"],A="wiki-new",b=["classic","list","rollover"],R=e=>{let t={},n=[],i=null,o=null;for(let l of(e||"").split(`
`)){let s=l.trim();if(!s||s.startsWith("//"))continue;let c=s.match(/^FACTORY\s+(\S+)$/i);if(c){let r=c[1].toLowerCase();b.includes(r)&&(i=r);continue}let f=s.match(/^LEVEL\s+(\S+)$/i);if(f){o=f[1].toUpperCase(),t[o]||(t[o]=[]);continue}if(s.toUpperCase()==="HIDE"){o="HIDE";continue}if(s.toUpperCase()==="ALL"&&o&&o!=="HIDE"){t[o]="ALL";continue}o==="HIDE"?n.push(s):o&&(Array.isArray(t[o])||(t[o]=[]),t[o].includes(s)||t[o].push(s))}return{levels:t,hide:n,factory:i}},j=(e,t,n)=>{if(!t||!e)return e;let{levels:i,hide:o}=t,l=new Set((o||[]).map(c=>c.toLowerCase())),s=i&&i[n];return e.filter(c=>{if(!c||!c.name)return!1;let f=c.name.toLowerCase();return l.has(f)?!1:!s||s==="ALL"?!0:s.map(r=>r.toLowerCase()).includes(f)})},h,y=null,u="AUTHOR",w="classic",q=()=>{try{let e=localStorage.getItem(A);if(!e)return;let t=JSON.parse(e);t.config&&(y=t.config),t.level&&m.includes(t.level)&&(u=t.level),t.factory==="chooser"?w="list":b.includes(t.factory)&&(w=t.factory)}catch{}},k=()=>{try{localStorage.setItem(A,JSON.stringify({config:y,level:u,factory:w}))}catch{}},C=e=>j(e,y,u);typeof window<"u"&&window!==null&&(q(),window.catalog&&(h=C(window.catalog)),Object.defineProperty(window,"catalog",{get(){return h},set(e){h=C(e)},configurable:!0,enumerable:!0}));var L={NUBE:{label:"Nube",hint:"Newcomer \u2014 basic text, image, and video"},AUTHOR:{label:"Author",hint:"Content creator \u2014 adds structured data items"},EXPERT:{label:"Expert",hint:"Experienced \u2014 most plugins available"},GEEK:{label:"Geek",hint:"All plugins minus the hidden list"}},_=(e,t)=>{let{label:n,hint:i}=L[e]||{label:e,hint:""};return`<button class="${e===t?"new-btn new-active":"new-btn"}" data-level="${e}" title="${i}">${n}</button>`},N=(e,t)=>{if(!window.catalog)return"<em>plugin list not loaded yet</em>";let n=j(window.catalog,e,t);return!n||!n.length?"<em>no plugins at this level</em>":n.map(i=>`<span class="new-pill">${i.name}</span>`).join(" ")},D={classic:{label:"Classic",hint:"The default wiki factory \u2014 untouched"},list:{label:"List",hint:"Searchable list \u2014 each plugin with a short summary"},rollover:{label:"Rollover",hint:"Tabbed pills \u2014 roll over for what each plugin does"}},O=e=>'<span class="new-factory-label">Factory style</span> '+b.map(t=>{let{label:n,hint:i}=D[t];return`<button class="${t===e?"new-btn new-active":"new-btn"} new-fbtn" data-factory="${t}" title="${i}">${n}</button>`}).join(" "),B=()=>{try{$(".item.factory").each(function(){let e=$(this),t=e.data("item");t&&t.type==="factory"&&(e.empty(),window.plugins.factory.emit(e,t))})}catch{}},Y=`
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
</style>`,E=!1,K=()=>{(E||!document.getElementById("wiki-new-styles"))&&(E||(document.head.insertAdjacentHTML("beforeend",Y),E=!0))},J=(e,t)=>{K();let n=R(t.text),i=u,o=m.map(s=>_(s,i)).join(""),l=L[i]?.hint||"";e.html(`<div class="wiki-plugin-new"><div class="new-levels">${o}</div><div class="new-pills">${N(n,i)}</div><div class="new-hint">${l}</div><div class="new-factory">${O(w)}</div></div>`)},V=(e,t)=>{let n=R(t.text);if(y=n,n.factory&&(w=n.factory),k(),h)try{wiki.origin.get("system/factories.json",(i,o)=>{i||(window.catalog=o),p(e,t,n)})}catch{p(e,t,n)}p(e,t,n),e.on("click",".new-btn",function(){let i=this.dataset.level;if(m.includes(i)){u=i,k();try{wiki.origin.get("system/factories.json",(o,l)=>{o||(window.catalog=l),p(e,t,n)})}catch{p(e,t,n)}}}),e.on("click",".new-fbtn",function(){let i=this.dataset.factory;b.includes(i)&&(w=i,k(),p(e,t,n),B())}),e.on("dblclick",()=>wiki.textEditor(e,t))},p=(e,t,n)=>{let i=u,o=m.map(s=>_(s,i)).join(""),l=L[i]?.hint||"";e.find(".new-levels").html(o),e.find(".new-pills").html(N(n,i)),e.find(".new-hint").text(l),e.find(".new-factory").html(O(w))};typeof window<"u"&&window!==null&&(window.plugins=window.plugins||{},window.plugins.new={emit:J,bind:V,editor:(e,t)=>window.wiki.textEditor(e,t)},T());})();
//# sourceMappingURL=new.js.map
