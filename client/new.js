(()=>{var f=["NUBE","AUTHOR","EXPERT","GEEK"],m="wiki-new",v=e=>{let t={},i=[],n=null;for(let l of(e||"").split(`
`)){let o=l.trim();if(!o||o.startsWith("//"))continue;let s=o.match(/^LEVEL\s+(\S+)$/i);if(s){n=s[1].toUpperCase(),t[n]||(t[n]=[]);continue}if(o.toUpperCase()==="HIDE"){n="HIDE";continue}if(o.toUpperCase()==="ALL"&&n&&n!=="HIDE"){t[n]="ALL";continue}n==="HIDE"?i.push(o):n&&(Array.isArray(t[n])||(t[n]=[]),t[n].includes(o)||t[n].push(o))}return{levels:t,hide:i}},E=(e,t,i)=>{if(!t||!e)return e;let{levels:n,hide:l}=t,o=new Set((l||[]).map(a=>a.toLowerCase())),s=n&&n[i];return e.filter(a=>{if(!a||!a.name)return!1;let g=a.name.toLowerCase();return o.has(g)?!1:!s||s==="ALL"?!0:s.map(y=>y.toLowerCase()).includes(g)})},d,u=null,r="AUTHOR",k=()=>{try{let e=localStorage.getItem(m);if(!e)return;let t=JSON.parse(e);t.config&&(u=t.config),t.level&&f.includes(t.level)&&(r=t.level)}catch{}},b=()=>{try{localStorage.setItem(m,JSON.stringify({config:u,level:r}))}catch{}},h=e=>E(e,u,r);typeof window<"u"&&window!==null&&(k(),window.catalog&&(d=h(window.catalog)),Object.defineProperty(window,"catalog",{get(){return d},set(e){d=h(e)},configurable:!0,enumerable:!0}));var p={NUBE:{label:"Nube",hint:"Newcomer \u2014 basic text, image, and video"},AUTHOR:{label:"Author",hint:"Content creator \u2014 adds structured data items"},EXPERT:{label:"Expert",hint:"Experienced \u2014 most plugins available"},GEEK:{label:"Geek",hint:"All plugins minus the hidden list"}},L=(e,t)=>{let{label:i,hint:n}=p[e]||{label:e,hint:""};return`<button class="${e===t?"new-btn new-active":"new-btn"}" data-level="${e}" title="${n}">${i}</button>`},x=(e,t)=>{if(!window.catalog)return"<em>plugin list not loaded yet</em>";let i=E(window.catalog,e,t);return!i||!i.length?"<em>no plugins at this level</em>":i.map(n=>`<span class="new-pill">${n.name}</span>`).join(" ")},S=`
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
</style>`,w=!1,A=()=>{(w||!document.getElementById("wiki-new-styles"))&&(w||(document.head.insertAdjacentHTML("beforeend",S),w=!0))},C=(e,t)=>{A();let i=v(t.text),n=r,l=f.map(s=>L(s,n)).join(""),o=p[n]?.hint||"";e.html(`<div class="wiki-plugin-new"><div class="new-levels">${l}</div><div class="new-pills">${x(i,n)}</div><div class="new-hint">${o}</div></div>`)},j=(e,t)=>{let i=v(t.text);if(u=i,b(),d)try{wiki.origin.get("system/factories.json",(n,l)=>{n||(window.catalog=l),c(e,t,i)})}catch{c(e,t,i)}c(e,t,i),e.on("click",".new-btn",function(){let n=this.dataset.level;if(f.includes(n)){r=n,b();try{wiki.origin.get("system/factories.json",(l,o)=>{l||(window.catalog=o),c(e,t,i)})}catch{c(e,t,i)}}}),e.on("dblclick",()=>wiki.textEditor(e,t))},c=(e,t,i)=>{let n=r,l=f.map(s=>L(s,n)).join(""),o=p[n]?.hint||"";e.find(".new-levels").html(l),e.find(".new-pills").html(x(i,n)),e.find(".new-hint").text(o)};typeof window<"u"&&window!==null&&(window.plugins=window.plugins||{},window.plugins.new={emit:C,bind:j});})();
//# sourceMappingURL=new.js.map
