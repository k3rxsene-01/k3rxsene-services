const $ = (s, p=document) => p.querySelector(s);
const $$ = (s, p=document) => [...p.querySelectorAll(s)];
const state = { session:null, items:[], catalog:[], game:null, market:null, express:false, filters:{category:'all',sort:'popular',price:'all',avail:'all',q:''}, searchIndex:null, reviewSummary:{} };
async function ensureReviewSummary(game){ if(state.reviewSummary[game])return state.reviewSummary[game]; try{const r=await api(`/api/reviews/summary?game=${game}`); state.reviewSummary[game]=r.summary}catch{state.reviewSummary[game]={}} return state.reviewSummary[game]}
function starIcon(filled){return `<svg viewBox="0 0 24 24" class="${filled?'':'empty'}"><path d="M12 2.5l2.9 6.6 7.1.7-5.4 4.7 1.6 7-6.2-3.7-6.2 3.7 1.6-7L2 9.8l7.1-.7z"/></svg>`}
function ratingRowHtml(game,id){const s=(state.reviewSummary[game]||{})[id];if(!s||!s.count)return'';const full=Math.round(s.avg);return `<div class="rating-row"><span class="rating-stars">${[1,2,3,4,5].map(n=>starIcon(n<=full)).join('')}</span><b>${s.avg.toFixed(1)}</b><span class="rating-count">(${s.count} review${s.count===1?'':'s'})</span></div>`}
const GAME_META = { blox:{name:'Blox Fruits', img:'/bloxfruits.png'}, garden:{name:'Grow a Garden', img:'/growagarden.png'} };
const gameNames = { blox:GAME_META.blox.name, garden:GAME_META.garden.name };
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const esc = value => String(value ?? '').replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
const safeNext = value => ['/inr.html','/inr-blox-fruits.html','/inr-grow-a-garden.html','/roblox-login.html'].includes(value) ? value : '/inr.html';
async function api(url, options={}) { const r=await fetch(url,{headers:{'Content-Type':'application/json',...(options.headers||{})},...options}); const data=await r.json().catch(()=>({error:'Unexpected server response.'})); if(!r.ok) throw new Error(data.error||'Something went wrong.'); return data; }
function toast(message){let e=$('.toast');if(!e){e=document.createElement('div');e.className='toast';e.setAttribute('role','status');e.setAttribute('aria-live','polite');document.body.append(e)}e.textContent=message;e.classList.remove('hidden');clearTimeout(window.toastTimer);window.toastTimer=setTimeout(()=>e.classList.add('hidden'),3600)}
function money(value){return value==null?'Price on request':`₹${value.toLocaleString('en-IN')}`}

/* ---------- local, device-only storage (wishlist / recently viewed / recent orders / recent searches) ---------- */
const LS = {
  read(key,fallback){try{const v=JSON.parse(localStorage.getItem(key));return v==null?fallback:v}catch{return fallback}},
  write(key,value){try{localStorage.setItem(key,JSON.stringify(value))}catch{}}
};
const wishlist = {
  key:'k3_wishlist',
  all(){return LS.read(this.key,[])},
  has(game,id){return this.all().some(w=>w.game===game&&w.id===id)},
  toggle(entry){let list=this.all();const idx=list.findIndex(w=>w.game===entry.game&&w.id===entry.id);let added;if(idx>-1){list.splice(idx,1);added=false}else{list.unshift(entry);added=true}LS.write(this.key,list.slice(0,60));updateWishlistBadge();return added},
  remove(game,id){LS.write(this.key,this.all().filter(w=>!(w.game===game&&w.id===id)));updateWishlistBadge()}
};
const recentlyViewed = {
  key:'k3_recent_viewed',
  all(){return LS.read(this.key,[])},
  push(entry){let list=this.all().filter(r=>!(r.game===entry.game&&r.id===entry.id));list.unshift(entry);LS.write(this.key,list.slice(0,8))}
};
const localOrders = {
  key:'k3_local_orders',
  all(){return LS.read(this.key,[])},
  push(entry){let list=this.all();list.unshift(entry);LS.write(this.key,list.slice(0,25))}
};
const recentSearches = {
  key:'k3_recent_searches',
  all(){return LS.read(this.key,[])},
  push(q){if(!q||q.trim().length<2)return;let list=this.all().filter(s=>s.toLowerCase()!==q.toLowerCase());list.unshift(q.trim());LS.write(this.key,list.slice(0,6))},
  clear(){LS.write(this.key,[])}
};
function updateWishlistBadge(){const n=wishlist.all().length;$$('.wishlist-count').forEach(el=>{el.textContent=n;el.classList.toggle('hidden',n===0)})}

/* ---------- session-scoped cart persistence per game + market ---------- */
function cartKey(game,market){return `k3cart:${market||'public'}:${game}`}
function saveCart(){if(!state.game)return;sessionStorage.setItem(cartKey(state.game,state.market),JSON.stringify(state.items.map(i=>({id:i.id,quantity:i.quantity}))))}
function hydrateCart(){if(!state.game)return;let saved=[];try{saved=JSON.parse(sessionStorage.getItem(cartKey(state.game,state.market))||'[]')}catch{}state.items=saved.map(s=>{const item=state.catalog.find(c=>c.id===s.id);return item?{...item,quantity:Math.min(99,Math.max(1,s.quantity))}:null}).filter(Boolean)}

/* ---------- icons ---------- */
const ICONS = {
  level:'<path d="M4 14h3v6H4zM10.5 9h3v11h-3zM17 4h3v16h-3z"/>',
  race:'<path d="M12 3c2 3 5 6 5 10a5 5 0 0 1-10 0c0-1.5.6-2.6 1.3-3.6.2 1 .9 1.8 1.7 2.1-.3-2.7.7-5.2 2-8.5z"/>',
  raid:'<path d="M4 9 12 3l8 6-8 12z"/><path d="M4 9h16"/>',
  bounty:'<circle cx="12" cy="10" r="7"/><path d="M8 17h8M9 17v3M15 17v3"/>',
  temple:'<path d="M12 21s7-7.5 7-12a7 7 0 0 0-14 0c0 4.5 7 12 7 12z"/><circle cx="12" cy="9" r="2.3"/>',
  race2:'<path d="M4 9c0-3 3.5-5 8-5s8 2 8 5v3c0 4-3.5 7-8 7s-8-3-8-7z"/>',
  sword:'<path d="M4 20 16 8"/><path d="M13 5l3 3-2 2-3-3z"/><path d="M20 20 8 8"/><path d="M11 5 8 8l2 2 3-3z"/>',
  guitar:'<circle cx="8" cy="17" r="3"/><circle cx="16" cy="15" r="3"/><path d="M11 17V4l8-2v13"/>',
  coin:'<circle cx="12" cy="12" r="8"/><path d="M12 8v8M9.5 10c0-1.4 1.2-2.4 2.5-2.4s2.5.9 2.5 2.1c0 2.1-3 1.9-3 4"/>',
  shield:'<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  flame:'<path d="M12 21s7-4.5 7-10a7 7 0 0 0-7-7 5 5 0 0 0-1 9.9C9.5 12 8 10.5 8 8c-2 2-3 4.5-3 7 0 3.3 3.1 6 7 6z"/>',
  leaf:'<path d="M5 20c9 0 14-5 14-14 0-1 0-2-.2-3C9.8 3.5 5 8.5 5 17c0 1 0 2 .2 3z"/><path d="M5 20 17 8"/>',
  drop:'<path d="M12 3c3.5 4.5 7 8.5 7 12.2A7 7 0 0 1 5 15.2C5 11.5 8.5 7.5 12 3z"/>',
  paw:'<circle cx="7" cy="8" r="2"/><circle cx="12" cy="6" r="2"/><circle cx="17" cy="8" r="2"/><path d="M12 12c-3.5 0-6 2.4-6 5.2 0 1.8 1.4 2.8 3 2.4 1-.3 2-.9 3-.9s2 .6 3 .9c1.6.4 3-.6 3-2.4 0-2.8-2.5-5.2-6-5.2z"/>',
  gift:'<rect x="4" y="9" width="16" height="12" rx="1.5"/><path d="M4 13h16M12 9v12"/><path d="M12 9C9.5 9 8 7.5 8 5.8 8 4.3 9.4 3.5 10.5 4.3 11.5 5 12 6.5 12 9zM12 9c2.5 0 4-1.5 4-3.2 0-1.5-1.4-2.3-2.5-1.5C12.5 5 12 6.5 12 9z"/>',
  star:'<path d="M12 3l2.5 6.5L21 11l-6.5 2.5L12 20l-2.5-6.5L3 11l6.5-2.5L12 3z"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  heart:'<path d="M12 20.5s-7.5-4.6-9.7-9.1C.6 8 2.2 4.5 5.6 3.9c2-.4 3.9.5 5 2.1 1.1-1.6 3-2.5 5-2.1 3.4.6 5 4.1 3.3 7.5-2.2 4.5-9.7 9.1-9.7 9.1z"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>',
  check:'<path d="M20 6 9 17l-5-5"/>',
  x:'<path d="M6 6l12 12M18 6 6 18"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v5h1"/>',
  roblox:'<rect x="5" y="5" width="14" height="14" rx="2" transform="rotate(-8 12 12)"/>',
};
function pickIcon(id){
  const k = String(id);
  if(/fruit/.test(k)) return ICONS.flame;
  if(/sword|ttk|katana/.test(k)) return ICONS.sword;
  if(/guitar/.test(k)) return ICONS.guitar;
  if(/race-v4/.test(k)) return ICONS.race;
  if(/mirage/.test(k)) return ICONS.temple;
  if(/ghoul|cyborg/.test(k)) return ICONS.race2;
  if(/bounty/.test(k)) return ICONS.bounty;
  if(/raid/.test(k)) return ICONS.raid;
  if(/beli|sheckle/.test(k)) return ICONS.coin;
  if(/recovery/.test(k)) return ICONS.shield;
  if(/leveling/.test(k)) return ICONS.level;
  if(/seed|lily|apple/.test(k)) return ICONS.leaf;
  if(/sprinkler/.test(k)) return ICONS.drop;
  if(/raccoon|dragonfly|pet/.test(k)) return ICONS.paw;
  if(/event/.test(k)) return ICONS.gift;
  return ICONS.star;
}
function svgIcon(id,extra=''){return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" ${extra}>${pickIcon(id)}</svg>`}
function ico(name,extra=''){return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" ${extra}>${ICONS[name]}</svg>`}

/* ---------- category grouping (presentational only — never touches price/data) ---------- */
const CATS = {
  blox: [
    {label:'Progression', match:id=>['leveling','race-v4','raids','bounty','mirage','beli'].includes(id)},
    {label:'Races', match:id=>['ghoul','cyborg'].includes(id)},
    {label:'Swords & Weapons', match:id=>['ttk','ttk-mastery','soul-guitar','soul-guitar-mastery','sword'].includes(id)},
    {label:'Account Support', match:id=>['recovery'].includes(id)},
    {label:'Physical Fruits', table:true, match:id=>id.startsWith('fruit-')},
  ],
  garden: [
    {label:'Seeds', match:id=>['ember-lily','sugar-apple'].includes(id)},
    {label:'Sprinklers', match:id=>['sprinkler','godly-sprinkler'].includes(id)},
    {label:'Pets', match:id=>['raccoon','dragonfly'].includes(id)},
    {label:'Currency & Other', match:()=>true},
  ],
};
function categoryFor(game,id){const cats=CATS[game]||[];const hit=cats.find(c=>c.match(id));return hit?hit.label:'Services'}
function isConstrained(tag){return /market item|availability-based|unstable market|price on request/i.test(tag||'')}
function scopeFor(item){
  const included=[item.description,'Fulfilment on the Roblox account you connect at checkout'];
  if(/mastery/i.test(item.tag||''))included.push('Full mastery grinding, as described');
  const excluded=['Anything outside the scope described above','Your Roblox account password — this is never requested or required'];
  if(isConstrained(item.tag))excluded.push('Guaranteed stock — availability for this item is confirmed after your order');
  return {included,excluded};
}
function requirementsFor(game){
  return [
    'A Roblox account you can connect through Roblox\u2019s own secure sign-in',
    'The account should not be currently banned or suspended',
    game==='garden' ? 'An active Grow a Garden save you want the service applied to' : 'A save file appropriate for the requested service'
  ];
}

/* ---------- chrome (header/footer/nav) ---------- */
function header(active=''){
  const wc=wishlist.all().length;
  return `<a class="skip-link" href="#main">Skip to content</a><header><nav class="wrap" aria-label="Primary">
<a class="brand" href="/"><span class="mark"><span>K</span></span>k3rxsene's Services</a>
<div class="nav-search" role="search"><label class="sr-only" for="siteSearch" style="position:absolute;left:-9999px">Search services</label>${ico('search')}<input id="siteSearch" type="search" placeholder="Search services, e.g. leveling, raids, seeds" autocomplete="off"><button class="clear-search" id="clearSearch" aria-label="Clear search">×</button><div class="search-panel" id="searchPanel" role="listbox"></div></div>
<div class="navlinks">
<a class="${active==='games'?'active':''}" href="/#games">Games</a><a href="/#status">Stats</a><a href="/support.html">Support</a>
<div class="nav-iconlinks">
<a class="nav-iconlink" href="/account.html?tab=wishlist" aria-label="Wishlist">${ico('heart')}<span class="count-badge wishlist-count${wc?'':' hidden'}">${wc}</span></a>
<a class="nav-iconlink" href="/account.html" aria-label="Your account">${ico('user')}</a>
</div>
<a class="btn blue" href="/#games">Get Started</a>
<button class="menu icon-btn" id="menu" aria-label="Open menu" aria-expanded="false"><svg class="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg><svg class="x-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
</div></nav></header>
<div class="mobile-menu" id="mobileMenu">
<div class="mobile-search"><label class="sr-only" for="siteSearchMobile" style="position:absolute;left:-9999px">Search services</label>${ico('search')}<input id="siteSearchMobile" type="search" placeholder="Search services" autocomplete="off"><div class="search-panel" id="searchPanelMobile" role="listbox"></div></div>
<a href="/#games">Games</a><a href="/#status">Stats</a><a href="/support.html">Support</a><a href="/account.html?tab=wishlist">Wishlist (${wc})</a><a href="/account.html">Your account</a><a class="btn blue" href="/#games">Get Started</a></div>`;
}
function footer(){return `<footer class="site-footer wrap"><span class="footer-brand"><span class="mark" style="width:26px;height:26px"><span style="font-size:11px">K</span></span>k3rxsene's Services</span><span>© 2026 k3rxsene's Services. Independent Roblox service provider — not affiliated with or endorsed by Roblox Corporation.</span><span><a href="/support.html">Support &amp; policies</a></span></footer>`}

function breadcrumbs(items){
  return `<nav class="breadcrumbs wrap" aria-label="Breadcrumb">${items.map((it,i)=>{
    const last=i===items.length-1;
    return (i?'<span class="sep">/</span>':'')+(last?`<span aria-current="page">${esc(it.label)}</span>`:`<a href="${it.href}">${esc(it.label)}</a>`);
  }).join('')}</nav>`;
}

function nav(){
  const menu=$('#menu');const mobile=$('#mobileMenu');
  if(menu){
    const close=()=>{mobile.classList.remove('open');menu.classList.remove('open');menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label','Open menu')};
    menu.onclick=()=>{if(mobile.classList.contains('open'))close();else{mobile.classList.add('open');menu.classList.add('open');menu.setAttribute('aria-expanded','true');menu.setAttribute('aria-label','Close menu')}};
    mobile.querySelectorAll('a').forEach(a=>a.onclick=close);
    document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
  }
  const onScroll=()=>document.querySelector('header')?.classList.toggle('scrolled',window.scrollY>8);
  window.addEventListener('scroll',onScroll,{passive:true});onScroll();
  bindSearch('siteSearch','searchPanel');
  bindSearch('siteSearchMobile','searchPanelMobile');
  bindWishlistButtons();
}

async function initSession(){try{state.session=await api('/api/session')}catch{state.session={inr:false,roblox:null,configured:{roblox:false}}}}

/* ---------- site search ---------- */
const POPULAR_SEARCHES=['Leveling','Race V4','Raids','Mastery farming','Money / Beli','Seeds','Sprinklers','Pets'];
async function ensureSearchIndex(){
  if(state.searchIndex)return state.searchIndex;
  try{
    const [blox,garden]=await Promise.all([api('/api/catalog?game=blox&market=global'),api('/api/catalog?game=garden&market=global')]);
    state.searchIndex=[...blox.items.map(i=>({...i,game:'blox'})),...garden.items.map(i=>({...i,game:'garden'}))];
  }catch{state.searchIndex=[]}
  return state.searchIndex;
}
function searchResultsMarkup(query){
  const q=query.trim().toLowerCase();
  if(!q){
    const recent=recentSearches.all();
    return `${recent.length?`<div class="search-group"><h4>Recent searches</h4><div class="search-chips">${recent.map(r=>`<button type="button" class="search-row chip" data-search-fill="${esc(r)}">${esc(r)}</button>`).join('')}</div></div>`:''}
<div class="search-group"><h4>Popular searches</h4><div class="search-chips">${POPULAR_SEARCHES.map(p=>`<button type="button" class="search-row chip" data-search-fill="${esc(p)}">${esc(p)}</button>`).join('')}</div></div>
<div class="search-group"><h4>Browse experiences</h4>
<a class="search-row" href="/blox-fruits.html"><span class="sr-icon">${svgIcon('sword')}</span>Blox Fruits</a>
<a class="search-row" href="/grow-a-garden.html"><span class="sr-icon">${svgIcon('leaf')}</span>Grow a Garden</a>
</div>`;
  }
  const idx=state.searchIndex||[];
  const matches=idx.filter(i=>i.name.toLowerCase().includes(q)||i.description.toLowerCase().includes(q)||(i.tag||'').toLowerCase().includes(q)).slice(0,8);
  if(!matches.length)return `<div class="search-empty">No services match "${esc(query)}".<br>Try “leveling”, “raids”, “seeds”, or browse a game below.</div><div class="search-group"><h4>Browse experiences</h4><a class="search-row" href="/blox-fruits.html"><span class="sr-icon">${svgIcon('sword')}</span>Blox Fruits</a><a class="search-row" href="/grow-a-garden.html"><span class="sr-icon">${svgIcon('leaf')}</span>Grow a Garden</a></div>`;
  return `<div class="search-group"><h4>${matches.length} result${matches.length===1?'':'s'}</h4>${matches.map(m=>`<a class="search-row" href="/service.html?game=${m.game}&id=${m.id}" data-search-query="${esc(query)}"><span class="sr-icon">${svgIcon(m.id)}</span><span>${esc(m.name)}<br><small style="color:var(--muted2)">${GAME_META[m.game].name}</small></span><span class="sr-meta">${esc(m.eta||'')}</span></a>`).join('')}</div>`;
}
function bindSearch(inputId,panelId){
  const input=$('#'+inputId);const panel=$('#'+panelId);
  if(!input||!panel)return;
  const wrap=input.closest('.nav-search,.mobile-search');
  const render=()=>{panel.innerHTML=searchResultsMarkup(input.value);wrap.classList.toggle('has-value',Boolean(input.value))};
  render();
  input.addEventListener('focus',async()=>{await ensureSearchIndex();render();panel.classList.add('open')});
  input.addEventListener('input',()=>{render();panel.classList.add('open')});
  input.addEventListener('keydown',e=>{if(e.key==='Escape'){panel.classList.remove('open');input.blur()}if(e.key==='Enter'){e.preventDefault();const first=panel.querySelector('.search-row[href]');if(first){recentSearches.push(input.value);location.href=first.getAttribute('href')}}});
  document.addEventListener('click',e=>{if(!wrap.contains(e.target))panel.classList.remove('open')});
  panel.addEventListener('click',e=>{
    const fill=e.target.closest('[data-search-fill]');
    const row=e.target.closest('.search-row[href]');
    if(fill){input.value=fill.dataset.searchFill;render();input.focus()}
    else if(row){recentSearches.push(row.dataset.searchQuery||input.value)}
  });
  const clearBtn=wrap.querySelector('.clear-search');
  if(clearBtn)clearBtn.onclick=()=>{input.value='';render();input.focus()};
}

/* ---------- wishlist buttons (delegated) ---------- */
function wishBtnMarkup(game,id,name,tag,eta){
  const active=wishlist.has(game,id);
  return `<button type="button" class="wish-btn${active?' active':''}" data-wish="${game}|${id}|${esc(name)}|${esc(tag||'')}|${esc(eta||'')}" aria-pressed="${active}" aria-label="${active?'Remove from':'Save to'} wishlist">${ico('heart')}</button>`;
}
function bindWishlistButtons(){
  document.addEventListener('click',e=>{
    const btn=e.target.closest('[data-wish]');
    if(!btn)return;
    const [game,id,name,tag,eta]=btn.dataset.wish.split('|');
    const added=wishlist.toggle({game,id,name,tag,eta});
    document.querySelectorAll(`[data-wish^="${game}|${id}|"]`).forEach(b=>{b.classList.toggle('active',added);b.setAttribute('aria-pressed',String(added))});
    toast(added?`${name} saved to your wishlist.`:`${name} removed from your wishlist.`);
  }, {once:false});
}

/* ---------- shared page fx (particles / progress / reveal / counters / accordion) — home only ---------- */
function initHomeFX(){
  const progress=$('#progress');
  const orbStage=$('#orbStage');
  const heroSection=$('.hero');
  window.addEventListener('scroll', () => {
    const h=document.documentElement;
    const pct=(h.scrollTop)/(h.scrollHeight-h.clientHeight)*100;
    if(progress) progress.style.width=pct+'%';
    if(!prefersReduced && orbStage && heroSection && window.scrollY < heroSection.offsetHeight){
      orbStage.style.transform='translateY('+(window.scrollY*0.12)+'px)';
    }
  },{passive:true});

  const io=new IntersectionObserver((entries)=>{entries.forEach((e,i)=>{if(e.isIntersecting){setTimeout(()=>e.target.classList.add('in'),i*60);io.unobserve(e.target)}})},{threshold:.15});
  $$('.reveal').forEach(el=>io.observe(el));

  const counted=new WeakSet();
  const statIO=new IntersectionObserver((entries)=>{entries.forEach(e=>{const el=e.target;if(e.isIntersecting && !counted.has(el)){counted.add(el);const target=parseInt(el.dataset.count,10);const suffix=el.dataset.suffix||'';if(prefersReduced){el.textContent=target+suffix;return}const start=performance.now();const dur=1100;function tick(now){const p=Math.min(1,(now-start)/dur);const eased=1-Math.pow(1-p,3);el.textContent=Math.round(target*eased)+suffix;if(p<1)requestAnimationFrame(tick);else el.textContent=target+suffix}requestAnimationFrame(tick)}})},{threshold:.4});
  $$('.stat b[data-count]').forEach(el=>statIO.observe(el));

  $$('.faq-q').forEach(btn=>{btn.onclick=()=>{const item=btn.parentElement;const was=item.classList.contains('active');item.classList.toggle('active');btn.setAttribute('aria-expanded',String(!was))}});

  const canvas=$('#bg-canvas'); if(!canvas) return;
  const ctx=canvas.getContext('2d'); let w,h,particles;
  function resize(){w=canvas.width=window.innerWidth;h=canvas.height=window.innerHeight}
  function make(){const count=Math.min(46,Math.floor(w/34));particles=Array.from({length:count},()=>({x:Math.random()*w,y:Math.random()*h,r:Math.random()*1.6+.6,vx:(Math.random()-.5)*.18,vy:(Math.random()-.5)*.18,hue:Math.random()>.5?'79,141,255':'110,231,255'}))}
  function draw(){ctx.clearRect(0,0,w,h);particles.forEach(p=>{p.x+=p.vx;p.y+=p.vy;if(p.x<0||p.x>w)p.vx*=-1;if(p.y<0||p.y>h)p.vy*=-1;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fillStyle=`rgba(${p.hue},0.55)`;ctx.fill()});for(let i=0;i<particles.length;i++)for(let j=i+1;j<particles.length;j++){const a=particles[i],b=particles[j];const d=Math.hypot(a.x-b.x,a.y-b.y);if(d<120){ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.strokeStyle=`rgba(120,160,255,${.12*(1-d/120)})`;ctx.lineWidth=1;ctx.stroke()}}requestAnimationFrame(draw)}
  resize();make();if(!prefersReduced)requestAnimationFrame(draw);else draw();
  window.addEventListener('resize',()=>{resize();make()},{passive:true});
}

/* ---------- home ---------- */
function renderHome(){
  document.body.className='';
  document.body.innerHTML=`${header('games')}
<canvas id="bg-canvas" aria-hidden="true"></canvas>
<div id="progress" role="presentation"></div>
<main id="main">
<section class="hero wrap">
  <div class="hero-copy reveal in">
    <p class="kicker"><span class="dot"></span>Independent Roblox service provider</p>
    <h1>Your next game goal, <em>properly handled.</em></h1>
    <p class="intro">We complete clearly-scoped progress, farming and unlock services inside Blox Fruits and Grow a Garden. Transparent pricing, a real Roblox sign-in for fulfilment, and no guesswork about what you're paying for.</p>
    <div class="hero-actions">
      <a class="btn blue" href="#games">Choose a game</a>
      <a class="btn ghost" href="#how">How it works</a>
    </div>
    <ul class="trust-row">
      <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/><path d="M9 12l2 2 4-4"/></svg> 500+ orders completed</li>
      <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg> Clear turnaround estimates</li>
      <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg> Roblox identity verified — no passwords</li>
    </ul>
  </div>
  <div class="orb-stage" id="orbStage" aria-hidden="true">
    <span class="ring ring1"></span><span class="ring ring2"></span>
    <i class="glow-dot gd1"></i><i class="glow-dot gd2"></i><i class="glow-dot gd3"></i>
    <div class="orb"><span class="sheen"></span><b>K</b></div>
  </div>
</section>
</main>
<div class="band">
<section class="section wrap" id="games">
  <div class="section-head reveal"><p class="kicker"><span class="dot"></span>Roblox experiences we support</p><h2>Choose your game</h2><p>Each catalogue keeps the same reliable flow, with services tailored to the experience.</p></div>
  <div class="game-grid reveal">
    <a class="game-card" href="/blox-fruits.html"><img src="/bloxfruits.png" alt="Blox Fruits"><h3>Blox Fruits</h3><p>Leveling, Race V4, raids, swords and more.</p><span class="btn blue">View services</span></a>
    <a class="game-card" href="/grow-a-garden.html"><img src="/growagarden.png" alt="Grow a Garden"><h3>Grow a Garden</h3><p>Valuable seeds, pets, sprinklers and currency.</p><span class="btn blue">View services</span></a>
    <article class="game-card" aria-label="More games coming soon">
      <span class="placeholder"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" width="60" height="60"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.2c0-1.5 1.2-2.6 2.6-2.6 1.5 0 2.6 1 2.6 2.3 0 2.2-3.1 2-3.1 4.2"/><path d="M12 17h.01"/></svg></span>
      <h3>More games</h3><p>New catalogues are being prepared.</p><span class="btn ghost">Coming soon</span>
    </article>
  </div>
</section>
</div>
<section class="section wrap" id="status">
  <div class="section-head reveal"><p class="kicker"><span class="dot"></span>Track record</p><h2>Our statistics</h2><p>Figures from our completed operations.</p></div>
  <div class="stats reveal">
    <div class="stat"><b data-count="500" data-suffix="+">0</b><span>Orders completed</span></div>
    <div class="stat"><b data-count="100" data-suffix="%">0</b><span>Orders server-priced &amp; validated</span></div>
    <div class="stat"><b data-count="50" data-suffix="+">0</b><span>Services offered</span></div>
    <div class="stat"><b>24/7</b><span>Support inbox</span></div>
  </div>
</section>
<div class="band">
<section class="section wrap" id="how">
  <div class="section-head reveal"><p class="kicker"><span class="dot"></span>Workflow</p><h2>How it works</h2><p>Four steps, start to finish — nothing is fulfilled until you've confirmed everything.</p></div>
  <div class="steps reveal">
    <article class="step"><div class="step-no">1</div><h3>Pick a game &amp; service</h3><p>Browse the Blox Fruits or Grow a Garden catalogue, open a service page to see exactly what's included, and add it to your cart.</p></article>
    <article class="step"><div class="step-no">2</div><h3>Connect Roblox</h3><p>Sign in with Roblox directly. We only ever receive your username and display name — never your password.</p></article>
    <article class="step"><div class="step-no">3</div><h3>Review &amp; submit</h3><p>Check the exact price, options and connected account, add optional notes, then submit your order.</p></article>
    <article class="step"><div class="step-no">4</div><h3>We fulfil it</h3><p>Your order is queued internally and worked on the account you connected. You'll be updated on progress and can track a local copy of your order in Your account.</p></article>
  </div>
</section>
</div>
<section class="section wrap" id="faq">
  <div class="section-head reveal"><p class="kicker"><span class="dot"></span>Support</p><h2>Frequently asked questions</h2><p>Everything worth knowing before you order. Full policies live on the <a href="/support.html" style="color:var(--accent2)">Support &amp; policies</a> page.</p></div>
  <div class="faq-wrap reveal">
    <div class="accordion">
      <article class="faq-item active"><button class="faq-q" aria-expanded="true">What is k3rxsene's Services?<span class="plus"></span></button><div class="faq-a"><div><p>An independent service provider handling Blox Fruits leveling, Race V4, swords and fruits, plus Grow a Garden seeds, pets and sprinklers — with a transparent catalogue and order flow. We are not affiliated with or endorsed by Roblox Corporation.</p></div></div></article>
      <article class="faq-item"><button class="faq-q" aria-expanded="false">How is pricing handled?<span class="plus"></span></button><div class="faq-a"><div><p>Every listed price is a starting rate, and every order total is calculated and validated on our server — nothing is trusted from your browser. Some items are availability-based and marked "Price on request"; submit a rate request and we'll follow up by email.</p></div></div></article>
      <article class="faq-item"><button class="faq-q" aria-expanded="false">How does Express Service work?<span class="plus"></span></button><div class="faq-a"><div><p>Express is a single flat surcharge added once to your order total for priority handling — it's never multiplied per item, and it's always optional.</p></div></div></article>
      <article class="faq-item"><button class="faq-q" aria-expanded="false">How long does fulfilment usually take?<span class="plus"></span></button><div class="faq-a"><div><p>Every service lists an estimated completion time on its service page. Market and availability-based items are confirmed after we check current stock.</p></div></div></article>
      <article class="faq-item"><button class="faq-q" aria-expanded="false">Do you need my Roblox login?<span class="plus"></span></button><div class="faq-a"><div><p>Never your password. Orders are confirmed through Roblox's own identity sign-in, which only shares your username and display name with us.</p></div></div></article>
      <article class="faq-item"><button class="faq-q" aria-expanded="false">Is regional pricing available?<span class="plus"></span></button><div class="faq-a"><div><p>Approved customers get access to a dedicated regional-pricing catalogue and checkout. Reach out directly if this applies to you.</p></div></div></article>
    </div>
  </div>
</section>
<section class="ready">
  <div class="section-head" style="max-width:none"><p class="kicker"><span class="dot"></span>k3rxsene's Services</p><h2>Ready to move your account forward?</h2><p>Join over 500+ customers who've had orders completed safely and on time.</p></div>
  <div class="cta-row"><a class="btn blue" href="#games">Browse services</a><a class="btn ghost" href="/support.html">Read our policies</a></div>
</section>
${footer()}`;
  nav();initHomeFX();
}

<<<<<<< HEAD
/* ---------- quantity stepper (shared by catalogue cards, fruit rows, detail page and the cart) ---------- */
=======
/* ---------- category grouping (presentational only — grouping/order, never touches price/data) ---------- */
const CATS = {
  blox: [
    {label:'Progression', match:id=>['leveling','race-v4','raids','bounty','mirage','beli','recovery'].includes(id)},
    {label:'Races', match:id=>['ghoul','cyborg'].includes(id)},
    {label:'Swords & Weapons', match:id=>['ttk','ttk-mastery','soul-guitar','soul-guitar-mastery','sword'].includes(id)},
    {label:'Physical Fruits', table:true, match:id=>id.startsWith('fruit-')},
  ],
  garden: [
    {label:'Seeds', match:id=>['ember-lily','sugar-apple'].includes(id)},
    {label:'Sprinklers', match:id=>['sprinkler','godly-sprinkler'].includes(id)},
    {label:'Pets', match:id=>['raccoon','dragonfly'].includes(id)},
    {label:'Currency & Other', match:()=>true},
  ],
};
function groupCatalog(){
  const cats=CATS[state.game]||[{label:'Services',match:()=>true}];
  const used=new Set();
  return cats.map(c=>{const items=state.catalog.filter(i=>!used.has(i.id)&&c.match(i.id));items.forEach(i=>used.add(i.id));return {...c,items}}).filter(g=>g.items.length);
}

/* ---------- quantity stepper (shared by catalogue cards, fruit rows, and the cart) ---------- */
>>>>>>> 405281bb12e82d3f478166c8643f30073f31ff96
function stepper(id, size=''){
  const item=state.items.find(x=>x.id===id);
  const qty=item?item.quantity:0;
  if(!qty) return `<button class="btn ghost${size?' '+size:''}" data-add="${id}">Add</button>`;
  return `<div class="qty-stepper${size?' '+size:''}"><button class="qty-btn" data-dec="${id}" aria-label="Decrease quantity">−</button><span class="qty-num">${qty}</span><button class="qty-btn" data-inc="${id}" aria-label="Increase quantity">+</button></div>`;
}

<<<<<<< HEAD
/* ---------- filtering & sorting (presentational only) ---------- */
function applyFilters(items){
  const f=state.filters;
  let list=items.slice();
  if(f.q.trim()){const q=f.q.trim().toLowerCase();list=list.filter(i=>i.name.toLowerCase().includes(q)||i.description.toLowerCase().includes(q))}
  if(f.avail==='available')list=list.filter(i=>!isConstrained(i.tag));
  if(f.avail==='constrained')list=list.filter(i=>isConstrained(i.tag));
  if(state.market==='inr'&&f.price!=='all'){
    list=list.filter(i=>{if(i.price==null)return f.price==='high';if(f.price==='low')return i.price<500;if(f.price==='mid')return i.price>=500&&i.price<1500;if(f.price==='high')return i.price>=1500;return true});
  }
  return list;
}
function sortItems(items){
  const s=state.filters.sort;const list=items.slice();
  if(s==='price-asc')list.sort((a,b)=>(a.price??Infinity)-(b.price??Infinity));
  else if(s==='price-desc')list.sort((a,b)=>(b.price??-1)-(a.price??-1));
  else if(s==='name')list.sort((a,b)=>a.name.localeCompare(b.name));
  else list.sort((a,b)=>(b.featured?1:0)-(a.featured?1:0));
  return list;
}
function groupCatalog(){
  const cats=CATS[state.game]||[{label:'Services',match:()=>true}];
  const filtered=applyFilters(state.catalog);
  const used=new Set();
  let groups=cats.map(c=>{const items=filtered.filter(i=>!used.has(i.id)&&c.match(i.id));items.forEach(i=>used.add(i.id));return {...c,items:sortItems(items)}}).filter(g=>g.items.length);
  if(state.filters.category!=='all')groups=groups.filter(g=>g.label===state.filters.category);
  return groups;
}
function activeFilterCount(){const f=state.filters;let n=0;if(f.category!=='all')n++;if(f.price!=='all')n++;if(f.avail!=='all')n++;if(f.q.trim())n++;return n}
function filterBarMarkup(){
  const cats=CATS[state.game]||[];
  const catChips=['all',...cats.map(c=>c.label)];
  const isInr=state.market==='inr';
  return `<div class="filter-bar" id="filterBar"><div class="fb-group" style="flex-wrap:wrap">
  ${catChips.map(c=>`<button type="button" class="filter-chip${state.filters.category===c?' active':''}" data-filter-cat="${esc(c)}">${c==='all'?'All categories':esc(c)}</button>`).join('')}
  </div>
  <div class="fb-group"><label for="fSort">Sort</label><select id="fSort"><option value="popular"${state.filters.sort==='popular'?' selected':''}>Most popular</option>${isInr?`<option value="price-asc"${state.filters.sort==='price-asc'?' selected':''}>Price: Low to High</option><option value="price-desc"${state.filters.sort==='price-desc'?' selected':''}>Price: High to Low</option>`:''}<option value="name"${state.filters.sort==='name'?' selected':''}>Name A–Z</option></select></div>
  ${isInr?`<div class="fb-group"><label for="fPrice">Price</label><select id="fPrice"><option value="all">Any price</option><option value="low"${state.filters.price==='low'?' selected':''}>Under ₹500</option><option value="mid"${state.filters.price==='mid'?' selected':''}>₹500–₹1,500</option><option value="high"${state.filters.price==='high'?' selected':''}>₹1,500+</option></select></div>`:''}
  <div class="fb-group"><label for="fAvail">Availability</label><select id="fAvail"><option value="all">All services</option><option value="available"${state.filters.avail==='available'?' selected':''}>Instantly available</option><option value="constrained"${state.filters.avail==='constrained'?' selected':''}>Availability-based</option></select></div>
  <span class="filter-count" id="filterCount"></span>
  <button type="button" class="filter-reset" id="filterReset" style="display:${activeFilterCount()?'inline':'none'}">Reset filters</button>
  </div><div class="filter-drawer-backdrop" id="filterBackdrop"></div>`;
}

/* ---------- catalogue pages (public + inr) ---------- */
function catalogMarkup(){
  const isInr=state.market==='inr';const heading=isInr?'Your catalogue':`${gameNames[state.game]} services`;
  document.body.className='';
  document.body.innerHTML=`${header(isInr?'':'games')}${breadcrumbs([{label:'Home',href:'/'},{label:gameNames[state.game],href:isInr?'':`/${state.game==='blox'?'blox-fruits':'grow-a-garden'}.html`}])}<main id="main"><section class="catalog-hero wrap"><p class="kicker"><span class="dot"></span>${isInr?'Private access':gameNames[state.game]}</p><h1>${heading}</h1><p>${isInr?'Your approved catalogue. Add services to your cart; every price and total is verified by the server at submission.':'Browse the catalogue, build a cart, and request a rate — every service page explains exactly what\u2019s included.'}</p><button type="button" class="btn ghost filter-drawer-toggle" id="filterToggle">${ico('search')} Filters &amp; sort<span id="filterToggleCount"></span></button></section><section class="wrap catalog-layout"><div><div class="notice" style="margin-bottom:16px"><strong>${state.game==='garden'?'Availability matters.':'Service scope matters.'}</strong> ${state.game==='garden'?'Grow a Garden market items are availability-based; an item marked “Price on request” cannot be checked out until a rate is agreed.':'Some services have account-specific scope; open a service for the full included / not-included breakdown.'}</div>${filterBarMarkup()}<p class="filter-count" id="resultCount" style="margin:0 0 14px"></p><div id="serviceGrid"></div></div><aside class="cart panel" id="cartAside"><h2>${isInr?'Your cart':'Your rate request'} <span class="cart-badge" id="cartBadge">0</span></h2><ul class="cart-items" id="cartItems"></ul>${isInr?`<div class="cart-summary"><div><span>Subtotal</span><b id="subtotal">₹0</b></div><div><span id="expressLabel">Express Service: Not applied</span><b id="expressPrice">—</b></div><div><strong>Total</strong><strong id="total">₹0</strong></div></div><div class="express"><label><input type="checkbox" id="express"> <span>Add Express Service <small>(+₹${state.expressSurcharge})</small></span></label><span>One priority surcharge per order. It is never multiplied by service.</span></div><button class="btn blue" style="width:100%" id="checkout">Continue to Roblox login</button>`:`<div class="field"><label for="quoteEmail">Contact email</label><input id="quoteEmail" type="email" required placeholder="you@example.com"></div><div class="field"><label for="quoteNotes">Notes (optional)</label><input id="quoteNotes" maxlength="400" placeholder="Any details we should know"></div><div class="error" id="quoteError"></div><button class="btn blue" style="width:100%" id="requestQuote">Send rate request</button>`}</aside></section></main>${footer()}<div class="modal" id="modal"></div><button class="cart-fab" id="cartFab" aria-label="Go to cart"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2 3h2l2.6 12.6a2 2 0 0 0 2 1.6h8a2 2 0 0 0 2-1.6L21 7H6"/></svg><span class="cart-fab-badge" id="cartFabBadge">0</span></button>`;
  bindServiceEvents();bindCartEvents();bindFilterEvents();renderServices();renderCart();nav();
  $('#cartFab').onclick=()=>$('#cartAside').scrollIntoView({behavior:prefersReduced?'auto':'smooth',block:'start'});
}
function bindFilterEvents(){
  const bar=$('#filterBar');if(!bar)return;
  bar.addEventListener('click',e=>{const chip=e.target.closest('[data-filter-cat]');if(chip){state.filters.category=chip.dataset.filterCat;renderServices();updateFilterChrome()}});
  const sort=$('#fSort');if(sort)sort.onchange=()=>{state.filters.sort=sort.value;renderServices()};
  const price=$('#fPrice');if(price)price.onchange=()=>{state.filters.price=price.value;renderServices();updateFilterChrome()};
  const avail=$('#fAvail');if(avail)avail.onchange=()=>{state.filters.avail=avail.value;renderServices();updateFilterChrome()};
  const reset=$('#filterReset');if(reset)reset.onclick=()=>{state.filters={category:'all',sort:'popular',price:'all',avail:'all',q:''};renderServices();refreshFilterBar()};
  const toggle=$('#filterToggle');const backdrop=$('#filterBackdrop');
  if(toggle){toggle.onclick=()=>{bar.classList.add('open');backdrop.classList.add('open')};backdrop.onclick=()=>{bar.classList.remove('open');backdrop.classList.remove('open')}}
}
function refreshFilterBar(){const wrap=$('#filterBar');if(!wrap)return;const parent=wrap.parentElement;const wasOpen=wrap.classList.contains('open');wrap.outerHTML=filterBarMarkup();bindFilterEvents();if(wasOpen){$('#filterBar').classList.add('open');$('#filterBackdrop').classList.add('open')}updateFilterChrome()}
function updateFilterChrome(){
  const n=activeFilterCount();
  const reset=$('#filterReset');if(reset)reset.style.display=n?'inline':'none';
  const tc=$('#filterToggleCount');if(tc)tc.textContent=n?` (${n})`:'';
}
function categoryBlockHtml(g){
  if(g.table){
    return `<div class="cat-block"><div class="cat-head"><h3>${g.label}</h3><span class="cat-count">${g.items.length} items</span></div><div class="fruit-card panel">${g.items.map(item=>`<div class="fruit-row"><span class="fr-name"><a href="/service.html?game=${state.game}&id=${item.id}" style="color:inherit">${esc(item.name)}</a>${item.tag?`<em class="fr-tag">${esc(item.tag)}</em>`:''}${item.eta?`<small class="fr-eta">Est. ${esc(item.eta)}</small>`:''}</span><span class="fr-price ${item.price==null?'request':''}">${money(item.price)}</span>${wishBtnMarkup(state.game,item.id,item.name,item.tag,item.eta)}<span class="fr-action">${stepper(item.id,'sm')}</span></div>`).join('')}</div></div>`;
  }
  return `<div class="cat-block"><div class="cat-head"><h3>${g.label}</h3><span class="cat-count">${g.items.length} items</span></div><div class="service-grid">${g.items.map(item=>`<article class="service-card">${wishBtnMarkup(state.game,item.id,item.name,item.tag,item.eta)}<div class="top-row"><span class="icon">${svgIcon(item.id)}</span><span class="tag">${item.tag||'Service'}${item.featured?' · Popular':''}</span></div><h3><a href="/service.html?game=${state.game}&id=${item.id}" style="color:inherit">${esc(item.name)}</a></h3><p>${esc(item.description)}</p>${ratingRowHtml(state.game,item.id)}${item.eta?`<p class="eta"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>Est. ${esc(item.eta)}</p>`:''}<footer><span class="price ${item.price==null?'request':''}">${money(item.price)}</span>${stepper(item.id)}</footer></article>`).join('')}</div></div>`;
}
function renderServices(){
  const grid=$('#serviceGrid');if(!grid)return;
  const groups=groupCatalog();
  const total=groups.reduce((n,g)=>n+g.items.length,0);
  const rc=$('#resultCount');if(rc)rc.textContent=`${total} service${total===1?'':'s'}${activeFilterCount()?' match your filters':' available'}`;
  updateFilterChrome();
  if(!total){grid.innerHTML=`<div class="empty-state panel">${ico('search')}<h3>No services match your filters</h3><p>Try clearing a filter or searching for something else.</p><button type="button" class="btn ghost" id="emptyReset">Clear filters</button></div>`;const b=$('#emptyReset');if(b)b.onclick=()=>{state.filters={category:'all',sort:'popular',price:'all',avail:'all',q:''};renderServices();refreshFilterBar()};return}
  grid.innerHTML=groups.map(categoryBlockHtml).join('');
}
function bindServiceEvents(){const grid=$('#serviceGrid');grid.addEventListener('click',e=>{const add=e.target.closest('[data-add]');const inc=e.target.closest('[data-inc]');const dec=e.target.closest('[data-dec]');if(add)addItem(add.dataset.add);else if(inc)addItem(inc.dataset.inc);else if(dec)decItem(dec.dataset.dec)})}
function addItem(id){const item=state.catalog.find(x=>x.id===id);if(!item)return;const existing=state.items.find(x=>x.id===id);if(existing){if(existing.quantity>=99)return;existing.quantity++}else{state.items.push({...item,quantity:1});toast(`${item.name} added.`)}saveCart();renderServices();renderCart()}
function decItem(id){const idx=state.items.findIndex(x=>x.id===id);if(idx<0)return;state.items[idx].quantity--;if(state.items[idx].quantity<=0)state.items.splice(idx,1);saveCart();renderServices();renderCart()}
function bindCartEvents(){const out=$('#cartItems');out.addEventListener('click',e=>{const inc=e.target.closest('[data-inc]');const dec=e.target.closest('[data-dec]');const rm=e.target.closest('[data-remove]');if(inc)addItem(inc.dataset.inc);else if(dec)decItem(dec.dataset.dec);else if(rm){state.items=state.items.filter(i=>i.id!==rm.dataset.remove);saveCart();renderServices();renderCart()}})}
=======
/* ---------- catalogue pages (public + inr) ---------- */
function catalogMarkup(){
  const isInr=state.market==='inr';const heading=isInr?'Your catalogue':`${gameNames[state.game]} services`;const theme=state.game==='garden'?'garden':state.game==='blox'?'bloxfruits':'';
  document.body.className=theme;
  document.body.innerHTML=`${header(isInr?'':'games')}<main id="main"><section class="catalog-hero wrap"><p class="kicker"><span class="dot"></span>${isInr?'Private access':gameNames[state.game]}</p><h1>${heading}</h1><p>${isInr?'Your approved catalogue. Add items to your cart; prices are verified by the server at submission.':'Browse the catalogue, build a cart, and request a rate.'}</p></section><section class="wrap catalog-layout"><div><div class="notice" style="margin-bottom:16px"><strong>${state.game==='garden'?'Availability matters.':'Service scope matters.'}</strong> ${state.game==='garden'?'Grow a Garden market items are availability-based; an item marked “Price on request” cannot be checked out until a rate is agreed.':'Some services have account-specific scope; final delivery details are confirmed after checkout.'}</div><div id="serviceGrid"></div></div><aside class="cart panel" id="cartAside"><h2>${isInr?'Your cart':'Your rate request'} <span class="cart-badge" id="cartBadge">0</span></h2><ul class="cart-items" id="cartItems"></ul>${isInr?`<div class="cart-summary"><div><span>Subtotal</span><b id="subtotal">₹0</b></div><div><span id="expressLabel">Express Service: Not applied</span><b id="expressPrice">—</b></div><div><strong>Total</strong><strong id="total">₹0</strong></div></div><div class="express"><label><input type="checkbox" id="express"> <span>Add Express Service <small>(+₹${state.expressSurcharge})</small></span></label><span>One priority surcharge per order. It is never multiplied by service.</span></div><button class="btn blue" style="width:100%" id="checkout">Continue to Roblox login</button>`:`<div class="field"><label for="quoteEmail">Contact email</label><input id="quoteEmail" type="email" required placeholder="you@example.com"></div><div class="field"><label for="quoteNotes">Notes (optional)</label><input id="quoteNotes" maxlength="400" placeholder="Any details we should know"></div><div class="error" id="quoteError"></div><button class="btn blue" style="width:100%" id="requestQuote">Send rate request</button>`}</aside></section></main>${footer()}<div class="modal" id="modal"></div><button class="cart-fab" id="cartFab" aria-label="Go to cart"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2 3h2l2.6 12.6a2 2 0 0 0 2 1.6h8a2 2 0 0 0 2-1.6L21 7H6"/></svg><span class="cart-fab-badge" id="cartFabBadge">0</span></button>`;
  bindServiceEvents();bindCartEvents();renderServices();renderCart();nav();
  $('#cartFab').onclick=()=>$('#cartAside').scrollIntoView({behavior:prefersReduced?'auto':'smooth',block:'start'});
}
function categoryBlockHtml(g){
  if(g.table){
    return `<div class="cat-block"><div class="cat-head"><h3>${g.label}</h3><span class="cat-count">${g.items.length} items</span></div><div class="fruit-card panel">${g.items.map(item=>`<div class="fruit-row"><span class="fr-name">${esc(item.name)}${item.tag?`<em class="fr-tag">${esc(item.tag)}</em>`:''}</span><span class="fr-price ${item.price==null?'request':''}">${money(item.price)}</span><span class="fr-action">${stepper(item.id,'sm')}</span></div>`).join('')}</div></div>`;
  }
  return `<div class="cat-block"><div class="cat-head"><h3>${g.label}</h3><span class="cat-count">${g.items.length} items</span></div><div class="service-grid">${g.items.map(item=>`<article class="service-card"><div class="top-row"><span class="icon">${svgIcon(item.id)}</span><span class="tag">${item.tag||'Service'}</span></div><h3>${esc(item.name)}</h3><p>${esc(item.description)}</p><footer><span class="price ${item.price==null?'request':''}">${money(item.price)}</span>${stepper(item.id)}</footer></article>`).join('')}</div></div>`;
}
function renderServices(){const grid=$('#serviceGrid');if(!grid)return;grid.innerHTML=groupCatalog().map(categoryBlockHtml).join('')}
function bindServiceEvents(){const grid=$('#serviceGrid');grid.addEventListener('click',e=>{const add=e.target.closest('[data-add]');const inc=e.target.closest('[data-inc]');const dec=e.target.closest('[data-dec]');if(add)addItem(add.dataset.add);else if(inc)addItem(inc.dataset.inc);else if(dec)decItem(dec.dataset.dec)})}
function addItem(id){const item=state.catalog.find(x=>x.id===id);if(!item)return;const existing=state.items.find(x=>x.id===id);if(existing){if(existing.quantity>=99)return;existing.quantity++}else{state.items.push({...item,quantity:1});toast(`${item.name} added.`)}renderServices();renderCart()}
function decItem(id){const idx=state.items.findIndex(x=>x.id===id);if(idx<0)return;state.items[idx].quantity--;if(state.items[idx].quantity<=0)state.items.splice(idx,1);renderServices();renderCart()}
function bindCartEvents(){const out=$('#cartItems');out.addEventListener('click',e=>{const inc=e.target.closest('[data-inc]');const dec=e.target.closest('[data-dec]');const rm=e.target.closest('[data-remove]');if(inc)addItem(inc.dataset.inc);else if(dec)decItem(dec.dataset.dec);else if(rm){state.items=state.items.filter(i=>i.id!==rm.dataset.remove);renderServices();renderCart()}})}
>>>>>>> 405281bb12e82d3f478166c8643f30073f31ff96
function renderCart(){const out=$('#cartItems');if(!out)return;const isInr=state.market==='inr';
  const count=state.items.reduce((n,i)=>n+i.quantity,0);
  const badge=$('#cartBadge');if(badge)badge.textContent=count;
  const fabBadge=$('#cartFabBadge');if(fabBadge)fabBadge.textContent=count;
  const fab=$('#cartFab');if(fab)fab.classList.toggle('has-items',count>0);
<<<<<<< HEAD
  if(!state.items.length)out.innerHTML=`<li class="cart-empty">No services selected yet. Add one from the catalogue${count?'':''} or a service page.</li>`;else out.innerHTML=state.items.map(i=>`<li class="cart-line"><span class="cl-icon">${svgIcon(i.id)}</span><span class="cl-info"><a href="/service.html?game=${state.game}&id=${i.id}" style="color:inherit">${esc(i.name)}</a><small>${isInr?`${money(i.price)} each · Est. ${esc(i.eta||'—')}`:`Quantity ${i.quantity}`}</small></span><span class="cart-line-right">${isInr?`<b>${money(i.price*i.quantity)}</b>`:''}${stepper(i.id,'sm')}<button class="cart-remove" aria-label="Remove ${esc(i.name)}" data-remove="${i.id}">×</button></span></li>`).join('');
=======
  if(!state.items.length)out.innerHTML='<li class="cart-empty">No services selected yet.</li>';else out.innerHTML=state.items.map(i=>`<li class="cart-line"><span class="cl-icon">${svgIcon(i.id)}</span><span class="cl-info">${esc(i.name)}<small>${isInr?`${money(i.price)} each`:`Quantity ${i.quantity}`}</small></span><span class="cart-line-right">${isInr?`<b>${money(i.price*i.quantity)}</b>`:''}${stepper(i.id,'sm')}<button class="cart-remove" aria-label="Remove ${esc(i.name)}" data-remove="${i.id}">×</button></span></li>`).join('');
>>>>>>> 405281bb12e82d3f478166c8643f30073f31ff96
  if(isInr){const subtotal=state.items.reduce((x,i)=>x+i.price*i.quantity,0), surcharge=state.express?state.expressSurcharge:0;$('#subtotal').textContent=money(subtotal);$('#total').textContent=money(subtotal+surcharge);$('#expressLabel').textContent=state.express?'Express Service: Applied':'Express Service: Not applied';$('#expressPrice').textContent=state.express?`+${money(surcharge)}`:'—';const box=$('#express');if(box){box.checked=state.express;box.onchange=()=>{state.express=box.checked;renderCart()};$('#checkout').onclick=checkout}}
  else{const btn=$('#requestQuote');if(btn)btn.onclick=requestQuote}}
function checkout(){if(!state.items.length)return toast('Add at least one service before continuing.');sessionStorage.setItem('k3order',JSON.stringify({game:state.game,items:state.items.map(i=>({id:i.id,quantity:i.quantity})),express:state.express}));location.href='/roblox-login.html'}
async function requestQuote(){const errEl=$('#quoteError');errEl.textContent='';if(!state.items.length)return errEl.textContent='Add at least one service before requesting a rate.';const email=$('#quoteEmail').value.trim();const btn=$('#requestQuote');btn.disabled=true;btn.textContent='Sending…';try{const r=await api('/api/quotes',{method:'POST',body:JSON.stringify({game:state.game,items:state.items.map(i=>({id:i.id,quantity:i.quantity})),email,notes:$('#quoteNotes').value})});localOrders.push({id:r.id,type:'quote',game:state.game,items:state.items.map(i=>({name:i.name,quantity:i.quantity})),email,status:'Rate requested',createdAt:new Date().toISOString()});state.items=[];saveCart();renderServices();renderCart();toast(`Request sent — reference ${r.id}. We'll reply by email with a rate.`)}catch(e){errEl.textContent=e.message}finally{btn.disabled=false;btn.textContent='Send rate request'}}

/* ---------- service detail page ---------- */
async function renderServiceDetail(){
  await initSession();
  const params=new URLSearchParams(location.search);
  const game=params.get('game');const id=params.get('id');
  if(!GAME_META[game]){return renderNotFound('That experience could not be found.')}
  document.body.className='';
  document.body.innerHTML=`${header()}<main id="main"><div class="wrap" style="padding-top:22px" id="detailRoot"><p>Loading service…</p></div></main>${footer()}`;
  nav();
  let data;
  try{data=await api(`/api/catalog/item?game=${game}&id=${encodeURIComponent(id)}`)}catch(e){$('#detailRoot').innerHTML=`<div class="empty-state panel">${ico('info')}<h3>Service unavailable</h3><p>${esc(e.message)}</p><a class="btn blue" href="/${game==='blox'?'blox-fruits':'grow-a-garden'}.html">Back to catalogue</a></div>`;return}
  const item=data.item;
  state.game=game;state.market=state.session.inr?'inr':'public';state.expressSurcharge=data.expressSurcharge||0;
  try{const full=await api(`/api/catalog?game=${game}&market=${state.market==='inr'?'inr':'global'}`);state.catalog=full.items}catch{state.catalog=[item]}
  await ensureReviewSummary(game);
  let reviews=[];try{const rv=await api(`/api/reviews?game=${game}&id=${encodeURIComponent(id)}`);reviews=rv.reviews}catch{reviews=[]}
  hydrateCart();
  recentlyViewed.push({game,id:item.id,name:item.name,tag:item.tag,eta:item.eta});
  const isInr=state.market==='inr';
  const scope=scopeFor(item);const reqs=requirementsFor(game);
  const catLabel=categoryFor(game,item.id);
  const related=state.catalog.filter(i=>i.id!==item.id&&categoryFor(game,i.id)===catLabel).slice(0,3);
  const recent=recentlyViewed.all().filter(r=>r.id!==item.id).slice(0,3);
  document.title=`${item.name} · ${gameNames[game]} · k3rxsene's Services`;
  document.body.innerHTML=`${header()}${breadcrumbs([{label:'Home',href:'/'},{label:gameNames[game],href:`/${game==='blox'?'blox-fruits':'grow-a-garden'}.html`},{label:item.name,href:'#'}])}
<main id="main"><div class="wrap">
<div class="detail-hero"><img src="${GAME_META[game].img}" alt=""><div><p class="kicker"><span class="dot"></span>${esc(catLabel)}${item.featured?' · Bestseller':''}</p><h1 style="font-size:clamp(26px,4vw,40px)">${esc(item.name)}</h1><p style="color:var(--muted);max-width:560px;margin-top:8px">${esc(item.description)}</p>${ratingRowHtml(game,item.id)}</div></div>
<div class="detail-layout">
  <div class="detail-main">
    <div class="panel"><h2>What's included</h2><div class="included-grid"><div class="yes"><h3>${ico('check')} Included</h3><ul>${scope.included.map(s=>`<li>${esc(s)}</li>`).join('')}</ul></div><div class="no"><h3>${ico('x')} Not included</h3><ul>${scope.excluded.map(s=>`<li>${esc(s)}</li>`).join('')}</ul></div></div></div>
    <div class="panel"><h2>Requirements before you order</h2><ul style="color:var(--muted);font-size:13.5px;line-height:1.8;padding-left:20px;margin:0">${reqs.map(r=>`<li>${esc(r)}</li>`).join('')}</ul></div>
    <div class="panel"><h2>Fulfilment process</h2><ol style="color:var(--muted);font-size:13.5px;line-height:1.9;padding-left:20px;margin:0"><li>Your order is recorded with an exact, server-verified price and queued internally.</li><li>Work begins on the Roblox account you connected at checkout.</li><li>${isConstrained(item.tag)?'For availability-based items, stock is confirmed first — we\u2019ll contact you if anything changes.':'Most orders begin the same day, subject to queue volume.'}</li><li>You'll be notified when the service is complete. Keep your order reference for any support request.</li></ol></div>
    ${related.length?`<div class="panel"><h2>Related services in ${esc(catLabel)}</h2><div class="related-strip">${related.map(r=>`<article class="service-card" style="min-height:auto"><div class="top-row"><span class="icon">${svgIcon(r.id)}</span><span class="tag">${r.tag||'Service'}</span></div><h3 style="font-size:15px"><a href="/service.html?game=${game}&id=${r.id}" style="color:inherit">${esc(r.name)}</a></h3><footer style="margin-top:10px"><span class="price ${r.price==null?'request':''}">${money(r.price)}</span><a class="btn ghost sm" href="/service.html?game=${game}&id=${r.id}">View</a></footer></article>`).join('')}</div></div>`:''}
    ${recent.length?`<div class="panel"><h2>Recently viewed</h2><div class="related-strip">${recent.map(r=>`<article class="service-card" style="min-height:auto"><div class="top-row"><span class="icon">${svgIcon(r.id)}</span></div><h3 style="font-size:15px"><a href="/service.html?game=${r.game}&id=${r.id}" style="color:inherit">${esc(r.name)}</a></h3></article>`).join('')}</div></div>`:''}
    <div class="panel"><h2>Customer reviews</h2>${ratingRowHtml(game,item.id)||'<p style="color:var(--muted);font-size:13.5px;margin-bottom:14px">No reviews yet for this service — be the first to complete an order and leave one.</p>'}
      <div id="reviewList">${reviews.length?reviews.map(r=>`<div class="review-card"><div class="rv-top"><span class="rating-stars">${[1,2,3,4,5].map(n=>starIcon(n<=r.rating)).join('')}</span><span style="color:var(--muted2)">${esc(r.displayName||'Verified customer')} · <span style="color:var(--accent2);font-weight:700">Order-verified</span></span></div>${r.text?`<p>${esc(r.text)}</p>`:''}</div>`).join(''):''}</div>
      <div class="review-form"><h3 style="font-size:14.5px;margin-bottom:6px">Leave a review</h3><p style="color:var(--muted);font-size:12.5px;margin-bottom:10px">Only customers with a completed order for this service can review it. Enter your order reference (e.g. K3-XXXXXXXX) to verify.</p>
        <div class="field"><label for="rvOrder">Order reference</label><input id="rvOrder" placeholder="K3-XXXXXXXX"></div>
        <div class="stars-input" id="rvStars">${[1,2,3,4,5].map(n=>`<button type="button" data-star="${n}" aria-label="${n} star${n===1?'':'s'}">${starIcon(false)}</button>`).join('')}</div>
        <div class="field"><label for="rvText">Your review (optional)</label><input id="rvText" maxlength="500" placeholder="How did the order go?"></div>
        <div class="error" id="rvError"></div>
        <button class="btn blue" id="rvSubmit" type="button">Submit review</button>
      </div>
    </div>
  </div>
  <aside class="buy-box panel">
    <div class="price-row"><b>${money(item.price)}</b>${wishBtnMarkup(game,item.id,item.name,item.tag,item.eta)}</div>
    ${item.tag?`<span class="badge${item.featured?' bestseller':''}" style="${item.featured?'':'background:var(--panel-solid);color:var(--muted);border:1px solid var(--line-strong)'}">${esc(item.tag)}</span>`:''}
    <p class="eta-row">${ico('clock')} Estimated completion: ${esc(item.eta||'Confirmed after order')}</p>
    <div id="detailStepper">${stepper(item.id)}</div>
    <div class="actions">
      ${isInr?`<button class="btn blue" id="buyNow" ${item.price==null?'disabled':''}>Buy now</button><a class="btn ghost" href="/${game==='blox'?'inr-blox-fruits':'inr-grow-a-garden'}.html" id="viewCartLink">View cart &amp; checkout</a>`:`<button class="btn blue" id="addQuote">Add to rate request</button><a class="btn ghost" href="/${game==='blox'?'blox-fruits':'grow-a-garden'}.html">Go to rate request →</a>`}
    </div>
    <div class="roblox-mini">${state.session.roblox?`<span class="dot-ok"></span><span><b>${esc(state.session.roblox.displayName)}</b>@${esc(state.session.roblox.username)} connected</span>`:`<span class="dot-off"></span><span>Roblox account connects during checkout — no password required.</span>`}</div>
  </aside>
</div>
</div></main>${footer()}`;
  nav();
  const refreshStepper=()=>{$('#detailStepper').innerHTML=stepper(item.id);bindDetailStepperEvents()};
  function bindDetailStepperEvents(){const root=$('#detailStepper');root.onclick=e=>{const add=e.target.closest('[data-add]');const inc=e.target.closest('[data-inc]');const dec=e.target.closest('[data-dec]');if(add||inc)addItem(item.id);else if(dec)decItem(item.id);refreshStepper()}}
  bindDetailStepperEvents();
  const buyNow=$('#buyNow');if(buyNow)buyNow.onclick=()=>{if(!state.items.find(i=>i.id===item.id))addItem(item.id);refreshStepper();checkout()};
  const addQuote=$('#addQuote');if(addQuote)addQuote.onclick=()=>{if(!state.items.find(i=>i.id===item.id))addItem(item.id);refreshStepper();toast(`${item.name} added to your rate request.`)};
  let chosenStars=0;
  const starsWrap=$('#rvStars');
  starsWrap.addEventListener('click',e=>{const b=e.target.closest('[data-star]');if(!b)return;chosenStars=Number(b.dataset.star);$$('button',starsWrap).forEach(btn=>{const n=Number(btn.dataset.star);btn.classList.toggle('active',n<=chosenStars);btn.innerHTML=starIcon(n<=chosenStars)})});
  $('#rvSubmit').onclick=async()=>{
    const errEl=$('#rvError');errEl.textContent='';
    const orderId=$('#rvOrder').value.trim().toUpperCase();
    if(!orderId)return errEl.textContent='Enter the order reference this review is for.';
    if(!chosenStars)return errEl.textContent='Choose a star rating.';
    const btn=$('#rvSubmit');btn.disabled=true;btn.textContent='Submitting…';
    try{
      await api('/api/reviews',{method:'POST',body:JSON.stringify({orderId,serviceId:item.id,rating:chosenStars,text:$('#rvText').value,public:true})});
      toast('Thanks — your review has been posted.');
      const rv=await api(`/api/reviews?game=${game}&id=${encodeURIComponent(id)}`);
      state.reviewSummary[game]=null;await ensureReviewSummary(game);
      $('#reviewList').innerHTML=rv.reviews.map(r=>`<div class="review-card"><div class="rv-top"><span class="rating-stars">${[1,2,3,4,5].map(n=>starIcon(n<=r.rating)).join('')}</span><span style="color:var(--muted2)">${esc(r.displayName||'Verified customer')} · <span style="color:var(--accent2);font-weight:700">Order-verified</span></span></div>${r.text?`<p>${esc(r.text)}</p>`:''}</div>`).join('');
      $('#rvOrder').value='';$('#rvText').value='';chosenStars=0;$$('button',starsWrap).forEach(btn2=>{btn2.classList.remove('active');btn2.innerHTML=starIcon(false)});
    }catch(e){errEl.textContent=e.message}finally{btn.disabled=false;btn.textContent='Submit review'}
  };
}
function renderNotFound(message){
  document.body.className='';
  document.body.innerHTML=`${header()}<main class="wrap" id="main" style="padding:60px 0"><div class="empty-state panel">${ico('info')}<h3>Not found</h3><p>${esc(message)}</p><a class="btn blue" href="/">Back home</a></div></main>${footer()}`;
  nav();
}

/* ---------- private / hidden access — no public links point here ---------- */
function renderInrLogin(){
  document.body.className='';
  document.body.innerHTML=`${header()}<main class="auth-page" id="main"><form class="auth-card panel" id="login"><p class="kicker"><span class="dot"></span>Private access</p><h1>Client sign in</h1><p>Use the access details supplied to you directly. There is no public registration.</p><div class="field"><label for="username">Username</label><input id="username" autocomplete="username" required></div><div class="field"><label for="password">Password</label><input id="password" type="password" autocomplete="current-password" required></div><div class="error" id="error" role="alert"></div><button class="btn blue" style="width:100%">Continue</button></form></main>${footer()}`;nav();
  $('#login').onsubmit=async e=>{e.preventDefault();const b=$('#login button');b.disabled=true;b.textContent='Checking access…';try{await api('/api/inr/login',{method:'POST',body:JSON.stringify({username:$('#username').value,password:$('#password').value})});location.href=safeNext(new URLSearchParams(location.search).get('next'))}catch(err){$('#error').textContent=err.message;b.disabled=false;b.textContent='Continue'}}
}
async function renderInr(){
  await initSession();if(!state.session.inr){location.href='/inr-login.html?next=/inr.html';return}
  document.body.className='';
  document.body.innerHTML=`${header()}<main id="main"><section class="catalog-hero wrap"><p class="kicker"><span class="dot"></span>Authenticated access</p><h1>Your catalogue</h1><p>Select a game to see its pricing and build a secure order.</p></section><section class="wrap section" style="padding-top:10px"><div class="game-grid"><a class="game-card" href="/inr-blox-fruits.html"><img src="/bloxfruits.png" alt="Blox Fruits"><h3>Blox Fruits</h3><p>Pricing and checkout.</p><span class="btn blue">View catalogue</span></a><a class="game-card" href="/inr-grow-a-garden.html"><img src="/growagarden.png" alt="Grow a Garden"><h3>Grow a Garden</h3><p>Pricing and checkout.</p><span class="btn blue">View catalogue</span></a><article class="game-card"><span class="placeholder"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" width="60" height="60"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.2c0-1.5 1.2-2.6 2.6-2.6 1.5 0 2.6 1 2.6 2.3 0 2.2-3.1 2-3.1 4.2"/><path d="M12 17h.01"/></svg></span><h3>More games</h3><p>Coming soon.</p></article></div><button class="btn ghost" style="margin-top:25px" id="logout">Sign out</button></section></main>${footer()}`;nav();
  $('#logout').onclick=async()=>{await api('/api/logout',{method:'POST'});location.href='/'}
}
async function renderRobloxLogin(){
  await initSession();const saved=JSON.parse(sessionStorage.getItem('k3order')||'null');if(!saved){location.href='/inr.html';return}
  try{const data=await api(`/api/catalog?game=${saved.game}&market=inr`);state.game=saved.game;state.market='inr';state.catalog=data.items;state.expressSurcharge=data.expressSurcharge}catch{location.href='/inr-login.html?next=/roblox-login.html';return}
  document.body.className='';
  document.body.innerHTML=`${header()}<main class="auth-page" id="main"><section class="auth-card panel" style="width:min(560px,100%)">
<div class="progress-track"><div class="progress-step done"><span class="ps-dot">${ico('check')}</span><span class="ps-label">Cart</span></div><div class="progress-line"></div><div class="progress-step current"><span class="ps-dot">2</span><span class="ps-label">Roblox</span></div><div class="progress-line"></div><div class="progress-step"><span class="ps-dot">3</span><span class="ps-label">Review</span></div></div>
<p class="kicker"><span class="dot"></span>Secure checkout</p><h1>Connect your Roblox identity</h1><p>Before you can confirm an order, sign in with Roblox directly. This order will be fulfilled for whichever account you connect here.</p><ul class="trust" style="margin:16px 0"><li>We only receive your Roblox username, display name and user ID</li><li>Your Roblox password is never requested, seen, or stored by us</li><li>Nothing is shared until you complete Roblox's own sign-in page</li></ul><div id="identityArea"></div><div class="error" id="error" role="alert"></div><button class="btn blue" style="width:100%" id="robloxAction">Connect with Roblox</button></section></main>${footer()}<div class="modal" id="modal"></div>`;nav();
  const action=$('#robloxAction');
  if(state.session.roblox){$('#identityArea').innerHTML=`<div class="identity"><b>${esc(state.session.roblox.displayName)}</b>@${esc(state.session.roblox.username)}<br><span>This is the account we'll fulfil your order on. Not the right account? Use “Change account” below — reconnecting isn't available mid-review.</span></div><button type="button" class="btn ghost" id="changeAccount" style="width:100%;margin-bottom:12px">Change account</button>`;action.textContent='Review and confirm order';action.onclick=()=>reviewOrder(saved);
    const change=$('#changeAccount');if(change)change.onclick=async()=>{change.disabled=true;change.textContent='Disconnecting…';try{await api('/api/roblox/disconnect',{method:'POST'})}catch{}location.href='/api/roblox/start'}}
  else{action.onclick=()=>{if(!state.session.configured.roblox)return toast('Roblox integration has not been configured yet.');location.href='/api/roblox/start'}}
}
function reviewOrder(saved){
  const modal=$('#modal');
  modal.innerHTML=`<section class="modal-card panel"><button class="modal-close" aria-label="Close">×</button><p class="kicker"><span class="dot"></span>Review order</p><h2>Confirm your order</h2><p style="color:var(--muted);font-size:13px;margin-bottom:14px">Fulfilled to <strong style="color:var(--text)">${esc(state.session.roblox.displayName)}</strong> (@${esc(state.session.roblox.username)}). Review scope and estimated turnaround below before submitting.</p><div id="reviewLines"></div><div class="express"><strong>Express Service: ${saved.express?`Applied (+₹${state.expressSurcharge})`:'Not applied'}</strong></div><div class="field notes-field"><label for="orderNotes">Notes for our team (optional)</label><textarea id="orderNotes" maxlength="400" placeholder="e.g. preferred progression order, in-game username if different"></textarea></div><label class="check-row"><input type="checkbox" id="ackPolicy"><span>I understand this order is fulfilled on the connected Roblox account above and I've read the <a href="/support.html#cancellation" target="_blank" rel="noopener">cancellation &amp; refund policy</a>.</span></label><div class="error" id="reviewError" role="alert"></div><button class="btn blue" style="width:100%" id="confirm">Submit secure order</button></section>`;
  modal.classList.add('show');$('.modal-close',modal).onclick=()=>modal.classList.remove('show');
  const found=saved.items.map(x=>({...state.catalog.find(i=>i.id===x.id),quantity:x.quantity}));
  const subtotal=found.reduce((x,i)=>x+i.price*i.quantity,0),sur=saved.express?state.expressSurcharge:0;
  $('#reviewLines').innerHTML=found.map(i=>`<div class="cart-line"><span>${esc(i.name)} ×${i.quantity}${i.eta?`<small>Est. ${esc(i.eta)}</small>`:''}</span><b>${money(i.price*i.quantity)}</b></div>`).join('')+`<div class="cart-summary"><div><span>Subtotal</span><b>${money(subtotal)}</b></div><div><strong>Total</strong><strong>${money(subtotal+sur)}</strong></div></div>`;
  $('#confirm').onclick=async()=>{
    const ack=$('#ackPolicy');const err=$('#reviewError');err.textContent='';
    if(!ack.checked){err.textContent='Please confirm you\u2019ve reviewed the fulfilment account and policy before submitting.';return}
    const b=$('#confirm');b.disabled=true;b.textContent='Submitting…';
    try{
      const notes=$('#orderNotes').value;
      const r=await api('/api/orders',{method:'POST',body:JSON.stringify({...saved,notes})});
      sessionStorage.removeItem('k3order');sessionStorage.removeItem(cartKey(saved.game,'inr'));
      localOrders.push({id:r.order.id,type:'order',game:saved.game,items:found.map(i=>({name:i.name,quantity:i.quantity})),total:r.order.total,express:saved.express,status:'Order received',createdAt:new Date().toISOString()});
      modal.innerHTML=`<section class="modal-card panel"><p class="kicker"><span class="dot"></span>Order received</p><h2>Thank you — ${esc(r.order.id)}</h2><p>Your order total is ${money(r.order.total)}. This is your reference number — save it for any follow-up.</p><div class="status-pill" style="margin-top:12px">${ico('check')} Order received</div><p style="color:var(--muted);font-size:13.5px;margin-top:14px">What happens next: your order has been recorded and queued internally against your connected Roblox account. This order is not yet complete — we'll be in touch to confirm fulfilment. Quote your reference number if you contact support.</p><div class="cta-row" style="justify-content:flex-start;margin-top:18px"><a class="btn blue" href="/inr.html">Back to catalogue</a><a class="btn ghost" href="/account.html?tab=orders">View in Your account</a></div></section>`;
    }catch(e){err.textContent=e.message;b.disabled=false;b.textContent='Submit secure order'}
  };
}

/* ---------- account ---------- */
async function renderAccount(){
  await initSession();
  document.body.className='';
  const tab=new URLSearchParams(location.search).get('tab')||(location.hash||'').replace('#','')||'overview';
  document.body.innerHTML=`${header()}<main id="main"><section class="catalog-hero wrap"><p class="kicker"><span class="dot"></span>Your account</p><h1>Account</h1><p>Manage your connected Roblox identity, saved services and a local copy of your recent orders.</p></section><section class="wrap section" style="padding-top:0"><div class="acct-grid">
  <nav class="acct-side" aria-label="Account sections">
    <a data-tab="overview" href="?tab=overview">${ico('user')} Overview</a>
    <a data-tab="roblox" href="?tab=roblox">${ico('roblox')} Roblox connection</a>
    <a data-tab="wishlist" href="?tab=wishlist">${ico('heart')} Wishlist</a>
    <a data-tab="orders" href="?tab=orders">${ico('clock')} Recent orders</a>
  </nav>
  <div>
    <div class="tab-panel" data-panel="overview"></div>
    <div class="tab-panel" data-panel="roblox"></div>
    <div class="tab-panel" data-panel="wishlist"></div>
    <div class="tab-panel" data-panel="orders"></div>
  </div>
  </div></section></main>${footer()}`;
  nav();
  renderAccountOverview();renderAccountRoblox();renderAccountWishlist();renderAccountOrders();
  const setTab=t=>{
    $$('.acct-side a').forEach(a=>a.classList.toggle('active',a.dataset.tab===t));
    $$('.tab-panel').forEach(p=>p.classList.toggle('active',p.dataset.panel===t));
    history.replaceState(null,'','?tab='+t);
  };
  $$('.acct-side a').forEach(a=>a.onclick=e=>{e.preventDefault();setTab(a.dataset.tab)});
  setTab(['overview','roblox','wishlist','orders'].includes(tab)?tab:'overview');
}
function renderAccountOverview(){
  const panel=$('[data-panel="overview"]');
  const wl=wishlist.all().length;const ord=localOrders.all().length;
  panel.innerHTML=`<div class="panel" style="padding:24px;margin-bottom:16px">
  ${state.session.roblox?`<div class="roblox-card"><div class="roblox-avatar">${esc(state.session.roblox.displayName.slice(0,1).toUpperCase())}</div><div class="rc-info"><b>${esc(state.session.roblox.displayName)}</b><span>@${esc(state.session.roblox.username)} · Roblox connected</span></div></div>`:`<div class="local-note">${ico('info')}<span>No Roblox account connected yet. You'll be asked to connect one during checkout — it only happens once per order session, and we never see your password.</span></div>`}
  <div class="steps" style="margin-top:18px"><article class="step"><div class="step-no">${wl}</div><h3>Saved services</h3><p>Services you've added to your wishlist.</p></article><article class="step"><div class="step-no">${ord}</div><h3>Local orders</h3><p>Orders &amp; rate requests submitted from this device.</p></article><article class="step"><div class="step-no">${state.session.inr?'✓':'—'}</div><h3>Private pricing</h3><p>${state.session.inr?'You have access to INR pricing catalogues.':'Not connected — ask us if this applies to you.'}</p></article></div>
  </div>
  <div class="panel" style="padding:20px 24px"><h2 style="font-size:16px;margin-bottom:10px">Quick links</h2><div class="cta-row" style="justify-content:flex-start"><a class="btn ghost" href="/blox-fruits.html">Blox Fruits catalogue</a><a class="btn ghost" href="/grow-a-garden.html">Grow a Garden catalogue</a><a class="btn ghost" href="/support.html">Support &amp; policies</a></div></div>`;
}
function renderAccountRoblox(){
  const panel=$('[data-panel="roblox"]');
  panel.innerHTML=`<div class="panel" style="padding:24px">
  <h2 style="font-size:17px;margin-bottom:6px">Roblox connection</h2>
  <p style="color:var(--muted);font-size:13.5px;margin-bottom:16px">We use Roblox's own sign-in to confirm which account your services are fulfilled on. We only ever receive your username, display name and Roblox user ID — never your password.</p>
  ${state.session.roblox?`<div class="roblox-card"><div class="roblox-avatar">${esc(state.session.roblox.displayName.slice(0,1).toUpperCase())}</div><div class="rc-info"><b>${esc(state.session.roblox.displayName)}</b><span>@${esc(state.session.roblox.username)} · this account will be used for any new order</span></div><div class="rc-actions"><button class="btn ghost" id="reconnectBtn">Change account</button></div></div>`
  :`<div class="local-note">${ico('info')}<span>${state.session.configured.roblox?'No account connected right now. Connecting happens automatically during checkout, or you can connect ahead of time below.':'Roblox authentication hasn\u2019t been configured on this deployment yet.'}</span></div>${state.session.configured.roblox?`<button class="btn blue" id="connectBtn" style="margin-top:14px">Connect Roblox account</button>`:''}`}
  </div>`;
  const reconnect=$('#reconnectBtn');if(reconnect)reconnect.onclick=async()=>{reconnect.disabled=true;reconnect.textContent='Disconnecting…';try{await api('/api/roblox/disconnect',{method:'POST'})}catch{}location.href='/api/roblox/start'};
  const connect=$('#connectBtn');if(connect)connect.onclick=()=>location.href='/api/roblox/start';
}
function renderAccountWishlist(){
  const panel=$('[data-panel="wishlist"]');
  const list=wishlist.all();
  panel.innerHTML=`<div class="panel" style="padding:24px"><h2 style="font-size:17px;margin-bottom:14px">Wishlist</h2>${list.length?`<div class="wl-grid">${list.map(w=>`<article class="service-card" style="min-height:auto">${wishBtnMarkup(w.game,w.id,w.name,w.tag,w.eta)}<div class="top-row"><span class="icon">${svgIcon(w.id)}</span><span class="tag">${gameNames[w.game]}</span></div><h3 style="font-size:15px"><a href="/service.html?game=${w.game}&id=${w.id}" style="color:inherit">${esc(w.name)}</a></h3>${w.eta?`<p class="eta">${ico('clock')} Est. ${esc(w.eta)}</p>`:''}<footer><a class="btn ghost sm" href="/service.html?game=${w.game}&id=${w.id}">View service</a></footer></article>`).join('')}</div>`:`<div class="empty-state">${ico('heart')}<h3>Your wishlist is empty</h3><p>Tap the heart on any service to save it here for later.</p><a class="btn blue" href="/#games">Browse services</a></div>`}</div>`;
}
const ORDER_STAGES=[['received','Received'],['in_progress','In progress'],['completed','Completed']];
function orderTrackerHtml(status){
  if(status==='cancelled'||status==='refunded')return `<div class="status-pill quote">${ico('info')} ${status==='cancelled'?'Cancelled':'Refunded'}</div>`;
  const idx=status==='needs_info'?0:ORDER_STAGES.findIndex(s=>s[0]===status);
  return `<div class="order-tracker">${ORDER_STAGES.map((s,i)=>{const done=i<idx||(i===idx&&status!=='needs_info');const current=i===idx;return `${i>0?`<div class="ot-line"></div>`:''}<div class="ot-step ${done?'done':''} ${current?'current':''} ${status==='needs_info'&&i===idx?'needs_info':''}"><span class="ot-dot"></span><span>${s[1]}</span></div>`}).join('')}</div>${status==='needs_info'?`<p style="color:var(--amber);font-size:12px;margin-top:6px">${ico('info')} We need more information from you — check your email or contact support with this reference.</p>`:''}`;
}
async function renderAccountOrders(){
  const panel=$('[data-panel="orders"]');
  const localList=localOrders.all();
  panel.innerHTML=`<div class="local-note">${ico('info')}<span>Orders placed while your Roblox account is connected show a live status pulled from our system. Rate requests and anything placed before connecting stay as a local, device-only reference.</span></div><div id="ordersBody"><p style="color:var(--muted);font-size:13px">Loading your orders…</p></div>`;
  let serverOrders=[];
  if(state.session.roblox){try{const r=await api('/api/orders/mine');serverOrders=r.orders}catch{}}
  const serverIds=new Set(serverOrders.map(o=>o.id));
  const localOnly=localList.filter(o=>!serverIds.has(o.id));
  const body=$('#ordersBody');
  if(!serverOrders.length && !localOnly.length){body.innerHTML=`<div class="empty-state panel">${ico('clock')}<h3>No orders yet</h3><p>Orders and rate requests you submit will appear here for your reference.</p><a class="btn blue" href="/#games">Browse services</a></div>`;return}
  body.innerHTML=[
    ...serverOrders.map(o=>`<div class="order-card"><div class="oc-top"><div><b>${esc(o.id)}</b><small>${gameNames[o.game]||o.game} · ${new Date(o.createdAt).toLocaleString()}</small></div><span class="status-pill">${ico('check')} ${esc(o.statusLabel)}</span></div>${orderTrackerHtml(o.status)}<div class="oc-lines">${o.items.map(i=>`<div><span>${esc(i.name)} ×${i.quantity}</span></div>`).join('')}</div><div style="display:flex;justify-content:space-between;align-items:center;font-size:13px;color:var(--muted);margin-top:8px"><span>${o.express?'Express applied · ':''}Total</span><b style="color:var(--text)">${money(o.total)}</b></div>${o.status==='completed'?`<div style="margin-top:10px"><a class="btn ghost sm" href="/service.html?game=${o.game}&id=${o.items[0].id}">Leave a review</a></div>`:''}</div>`),
    ...localOnly.map(o=>`<div class="order-card"><div class="oc-top"><div><b>${esc(o.id)}</b><small>${gameNames[o.game]||o.game} · ${new Date(o.createdAt).toLocaleString()}</small></div><span class="status-pill${o.type==='quote'?' quote':''}">${o.type==='quote'?ico('clock'):ico('check')} ${esc(o.status)}</span></div><div class="oc-lines">${o.items.map(i=>`<div><span>${esc(i.name)} ×${i.quantity}</span></div>`).join('')}</div><div style="display:flex;justify-content:space-between;align-items:center;font-size:13px;color:var(--muted)"><span>${o.type==='quote'?'Rate to be confirmed by email':`${o.express?'Express applied · ':''}Total`}</span>${o.total?`<b style="color:var(--text)">${money(o.total)}</b>`:''}</div></div>`)
  ].join('');
}

/* ---------- support / policies ---------- */
function renderSupport(){
  document.body.className='';
  document.body.innerHTML=`${header()}<main id="main"><section class="catalog-hero wrap"><p class="kicker"><span class="dot"></span>Help center</p><h1>Support &amp; policies</h1><p>Everything about how ordering, fulfilment, cancellations and support work.</p></section><section class="wrap section" style="padding-top:0;max-width:820px">
  <div class="policy-toc">
    <a href="#requirements">Requirements</a><a href="#pricing">Pricing &amp; payment</a><a href="#fulfilment">Fulfilment time</a><a href="#cancellation">Cancellation &amp; refunds</a><a href="#prohibited">Prohibited requests</a><a href="#contact">Contact support</a>
  </div>
  <div class="policy-block" id="requirements"><h2>Requirements &amp; your Roblox account</h2><p>Every order is fulfilled on a Roblox account you connect through Roblox's own secure sign-in.</p><ul><li><strong>We collect:</strong> your Roblox username, display name and user ID.</li><li><strong>We never collect:</strong> your Roblox password, payment card numbers, or anything beyond what Roblox's identity sign-in shares.</li><li>Your account should not be currently banned or suspended for the requested service to be completable.</li><li>You can change the connected account any time before submitting an order from the Roblox login step or from Your account → Roblox connection.</li></ul></div>
  <div class="policy-block" id="pricing"><h2>Pricing &amp; payment</h2><p>Listed prices are starting rates for the described scope. Every order total is calculated and validated on our server at submission — nothing about pricing is trusted from your browser. Availability-based items are marked "Price on request"; submit a rate request and we'll reply by email with a firm price before anything is charged.</p></div>
  <div class="policy-block" id="fulfilment"><h2>Estimated fulfilment time</h2><p>Each service page lists a typical completion window. These are estimates based on normal conditions and current queue volume, not guarantees — in-game events, maintenance, or high demand can extend them. We'll reach out if a specific order is going to take meaningfully longer than estimated.</p></div>
  <div class="policy-block" id="cancellation"><h2>Cancellation &amp; refund policy</h2><ul><li>You can request cancellation any time before work has started on your order by contacting support with your order reference.</li><li>Once work has begun, we'll assess cancellation requests case by case and refund any unstarted portion of a multi-part order.</li><li>Refunds for services that could not be completed due to an issue on our side are handled in full.</li><li>We don't refund for account status changes (e.g. a ban) that happen independently of the service we performed.</li></ul></div>
  <div class="policy-block" id="prohibited"><h2>Prohibited requests</h2><ul><li>We don't request or accept your Roblox account password under any circumstance.</li><li>We don't take on requests that require bypassing Roblox's own account-recovery process.</li><li>We reserve the right to decline any order that falls outside a clearly defined, in-experience service.</li></ul></div>
  <div class="policy-block" id="contact"><h2>Contact support</h2><p>Submit a support or refund request below, referencing your order or rate-request ID (format <code>K3-XXXXXXXX</code> or <code>Q-XXXXXXXX</code>). You'll get a request reference back and can check its status any time using the lookup underneath. You can also review a local copy of your recent orders from <a href="/account.html?tab=orders" style="color:var(--accent2)">Your account</a>.</p>
    <div class="panel" style="padding:22px;margin-top:16px">
      <h3 style="font-size:15px;margin-bottom:12px">Submit a request</h3>
      <div class="ticket-form">
        <div class="field"><label for="tkRef">Order or rate-request reference</label><input id="tkRef" placeholder="K3-XXXXXXXX"></div>
        <div class="field"><label for="tkEmail">Contact email</label><input id="tkEmail" type="email" placeholder="you@example.com"></div>
        <div class="field"><label for="tkReason">Reason</label><select id="tkReason"><option value="order-issue">Order issue</option><option value="cancellation">Cancellation</option><option value="refund">Refund</option><option value="account-issue">Roblox account issue</option><option value="other">Other</option></select></div>
        <div class="field"><label for="tkContext">Details</label><textarea id="tkContext" maxlength="800" placeholder="What's going on?"></textarea></div>
        <div class="field"><label for="tkOutcome">Desired outcome (optional)</label><input id="tkOutcome" maxlength="300" placeholder="e.g. a refund, a status update"></div>
        <div class="error" id="tkError"></div>
        <div id="tkSuccess" style="display:none;color:#7ee2a8;font-size:13px"></div>
        <button class="btn blue" id="tkSubmit" type="button" style="width:max-content">Send request</button>
      </div>
    </div>
    <div class="panel" style="padding:22px;margin-top:16px">
      <h3 style="font-size:15px;margin-bottom:12px">Check a request's status</h3>
      <div class="ticket-form" style="grid-template-columns:1fr 1fr;display:grid">
        <div class="field"><label for="tkLookupId">Request reference</label><input id="tkLookupId" placeholder="SR-XXXXXXXX"></div>
        <div class="field"><label for="tkLookupEmail">Email used</label><input id="tkLookupEmail" type="email"></div>
      </div>
      <button class="btn ghost" id="tkLookupBtn" type="button">Check status</button>
      <div id="tkLookupResult"></div>
    </div>
  </div>
  </section></main>${footer()}`;
  nav();
  if(location.hash){const el=document.querySelector(location.hash);if(el)setTimeout(()=>el.scrollIntoView({behavior:prefersReduced?'auto':'smooth',block:'start'}),50)}
  $('#tkSubmit').onclick=async()=>{
    const errEl=$('#tkError');const okEl=$('#tkSuccess');errEl.textContent='';okEl.style.display='none';
    const btn=$('#tkSubmit');btn.disabled=true;btn.textContent='Sending…';
    try{
      const r=await api('/api/support',{method:'POST',body:JSON.stringify({reference:$('#tkRef').value.trim().toUpperCase(),email:$('#tkEmail').value.trim(),reason:$('#tkReason').value,context:$('#tkContext').value,desiredOutcome:$('#tkOutcome').value})});
      okEl.style.display='block';okEl.textContent=`Request sent — reference ${r.id}. Save it to check status below.`;
      $('#tkRef').value='';$('#tkContext').value='';$('#tkOutcome').value='';
    }catch(e){errEl.textContent=e.message}finally{btn.disabled=false;btn.textContent='Send request'}
  };
  $('#tkLookupBtn').onclick=async()=>{
    const out=$('#tkLookupResult');const id=$('#tkLookupId').value.trim().toUpperCase();const email=$('#tkLookupEmail').value.trim();
    out.innerHTML='<p style="color:var(--muted);font-size:13px;margin-top:10px">Checking…</p>';
    try{
      const r=await api(`/api/support/lookup?id=${encodeURIComponent(id)}&email=${encodeURIComponent(email)}`);
      const statusLabel={submitted:'Submitted',under_review:'Under review',resolved:'Resolved'}[r.ticket.status]||r.ticket.status;
      out.innerHTML=`<div class="ticket-status"><span class="status-pill${r.ticket.status==='resolved'?'':' quote'}">${ico(r.ticket.status==='resolved'?'check':'clock')} ${esc(statusLabel)}</span><span style="color:var(--muted);font-size:12.5px">Reference ${esc(r.ticket.reference)} · Reason: ${esc(r.ticket.reason)}</span></div>${r.ticket.resolution?`<p style="color:var(--muted);font-size:13px;margin-top:8px">${esc(r.ticket.resolution)}</p>`:''}`;
    }catch(e){out.innerHTML=`<p class="error" style="margin-top:10px">${esc(e.message)}</p>`}
  };
}

async function renderCatalog(game,market){await initSession();if(market==='inr'&&!state.session.inr){location.href='/inr-login.html?next='+encodeURIComponent(`/inr-${game==='blox'?'blox-fruits':'grow-a-garden'}.html`);return}state.game=game;state.market=market;try{const data=await api(`/api/catalog?game=${game}&market=${market||'global'}`);state.catalog=data.items;state.expressSurcharge=data.expressSurcharge||0;hydrateCart();await ensureReviewSummary(game);catalogMarkup()}catch(e){document.body.className='';document.body.innerHTML=`${header()}<main class="auth-page"><section class="auth-card panel"><h1>Catalogue unavailable</h1><p>${esc(e.message)}</p><a class="btn blue" href="/">Back home</a></section></main>`;nav()}}

async function boot(){
  const path=location.pathname;
  if(path==='/')return renderHome();
  if(path==='/blox-fruits.html')return renderCatalog('blox','');
  if(path==='/grow-a-garden.html')return renderCatalog('garden','');
  if(path==='/inr-blox-fruits.html')return renderCatalog('blox','inr');
  if(path==='/inr-grow-a-garden.html')return renderCatalog('garden','inr');
  if(path==='/inr-login.html')return renderInrLogin();
  if(path==='/inr.html')return renderInr();
  if(path==='/roblox-login.html')return renderRobloxLogin();
  if(path==='/service.html')return renderServiceDetail();
  if(path==='/account.html')return renderAccount();
  if(path==='/support.html')return renderSupport();
  location.href='/';
}
boot();