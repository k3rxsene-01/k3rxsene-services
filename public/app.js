const $ = (s, p=document) => p.querySelector(s);
const $$ = (s, p=document) => [...p.querySelectorAll(s)];
const state = { session:null, items:[], catalog:[], game:null, market:null, express:false };
const gameNames = {blox:'Blox Fruits',garden:'Grow a Garden'};
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const esc = value => String(value ?? '').replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
const safeNext = value => ['/inr.html','/inr-blox-fruits.html','/inr-grow-a-garden.html','/roblox-login.html'].includes(value) ? value : '/inr.html';
async function api(url, options={}) { const r=await fetch(url,{headers:{'Content-Type':'application/json',...(options.headers||{})},...options}); const data=await r.json().catch(()=>({error:'Unexpected server response.'})); if(!r.ok) throw new Error(data.error||'Something went wrong.'); return data; }
function toast(message){let e=$('.toast');if(!e){e=document.createElement('div');e.className='toast';document.body.append(e)}e.textContent=message;e.classList.remove('hidden');clearTimeout(window.toastTimer);window.toastTimer=setTimeout(()=>e.classList.add('hidden'),3600)}
function money(value){return value==null?'Price on request':`₹${value.toLocaleString('en-IN')}`}

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
function svgIcon(id){return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${pickIcon(id)}</svg>`}

/* ---------- chrome (header/footer/nav) — no INR trace anywhere ---------- */
function header(active=''){return `<a class="skip-link" href="#main">Skip to content</a><header><nav class="wrap" aria-label="Primary"><a class="brand" href="/"><span class="mark"><span>K</span></span>k3rxsene's Services</a><div class="navlinks"><a class="${active==='games'?'active':''}" href="/#games">Games</a><a href="/#status">Stats</a><a href="/#faq">FAQ</a><a class="btn blue" href="/#games">Get Started</a><button class="menu icon-btn" id="menu" aria-label="Open menu" aria-expanded="false"><svg class="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg><svg class="x-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div></nav></header><div class="mobile-menu" id="mobileMenu"><a href="/#games">Games</a><a href="/#status">Stats</a><a href="/#faq">FAQ</a><a class="btn blue" href="/#games">Get Started</a></div>`}
function footer(){return `<footer class="site-footer wrap"><span class="footer-brand"><span class="mark" style="width:26px;height:26px"><span style="font-size:11px">K</span></span>k3rxsene's Services</span><span>© 2026 k3rxsene's Services. All rights reserved.</span><span>Secure ordering foundation</span></footer>`}
function nav(){const menu=$('#menu');const mobile=$('#mobileMenu');if(!menu)return;const close=()=>{mobile.classList.remove('open');menu.classList.remove('open');menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label','Open menu')};menu.onclick=()=>{if(mobile.classList.contains('open'))close();else{mobile.classList.add('open');menu.classList.add('open');menu.setAttribute('aria-expanded','true');menu.setAttribute('aria-label','Close menu')}};mobile.querySelectorAll('a').forEach(a=>a.onclick=close);document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});const onScroll=()=>document.querySelector('header')?.classList.toggle('scrolled',window.scrollY>8);window.addEventListener('scroll',onScroll,{passive:true});onScroll()}

async function initSession(){try{state.session=await api('/api/session')}catch{state.session={inr:false,roblox:null,configured:{roblox:false}}}}

/* ---------- shared page fx (particles / progress / reveal / counters / accordion) ---------- */
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
    <p class="kicker"><span class="dot"></span>Secure Roblox services</p>
    <h1>Your next game goal, <em>properly handled.</em></h1>
    <p class="intro">Trusted Roblox game services with a clear catalogue, transparent ordering, and Roblox identity verification before anything is confirmed.</p>
    <div class="hero-actions">
      <a class="btn blue" href="#games">Choose a game</a>
      <a class="btn ghost" href="#faq">How it works</a>
    </div>
    <ul class="trust-row">
      <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/><path d="M9 12l2 2 4-4"/></svg> 500+ orders completed</li>
      <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg> Fast turnaround</li>
      <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg> Roblox identity verified</li>
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
  <div class="section-head reveal"><p class="kicker"><span class="dot"></span>Game catalogue</p><h2>Choose your game</h2><p>Each catalogue keeps the same reliable flow, with services tailored to the game.</p></div>
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
  <div class="section-head reveal"><p class="kicker"><span class="dot"></span>Performance</p><h2>Our statistics</h2><p>Real-time metrics from our completed operations.</p></div>
  <div class="stats reveal">
    <div class="stat"><b data-count="500" data-suffix="+">0</b><span>Orders completed</span></div>
    <div class="stat"><b data-count="100" data-suffix="%">0</b><span>Safe execution</span></div>
    <div class="stat"><b data-count="50" data-suffix="+">0</b><span>Services offered</span></div>
    <div class="stat"><b>24/7</b><span>Customer support</span></div>
  </div>
</section>
<div class="band">
<section class="section wrap" id="process">
  <div class="section-head reveal"><p class="kicker"><span class="dot"></span>Workflow</p><h2>How it works</h2><p>Three steps, start to finish.</p></div>
  <div class="steps reveal">
    <article class="step"><div class="step-no">1</div><h3>Pick a game &amp; service</h3><p>Browse the Blox Fruits or Grow a Garden catalogue and add the services you need.</p></article>
    <article class="step"><div class="step-no">2</div><h3>Build your order</h3><p>Review your subtotal, add Express Service if you want it prioritised, and see the exact total.</p></article>
    <article class="step"><div class="step-no">3</div><h3>Confirm &amp; submit</h3><p>Verify your Roblox identity, review the order, and submit — no guesswork on price or scope.</p></article>
  </div>
</section>
</div>
<section class="section wrap" id="faq">
  <div class="section-head reveal"><p class="kicker"><span class="dot"></span>Support</p><h2>Frequently asked questions</h2><p>Everything worth knowing before you order.</p></div>
  <div class="faq-wrap reveal">
    <div class="accordion">
      <article class="faq-item active"><button class="faq-q" aria-expanded="true">What is k3rxsene's Services?<span class="plus"></span></button><div class="faq-a"><div><p>A Roblox services platform handling Blox Fruits leveling, Race V4, swords and fruits, plus Grow a Garden seeds, pets and sprinklers — with a transparent catalogue and order flow.</p></div></div></article>
      <article class="faq-item"><button class="faq-q" aria-expanded="false">How is pricing handled?<span class="plus"></span></button><div class="faq-a"><div><p>Every listed price is a starting rate. Some items are availability-based and marked "Price on request" — submit a rate request and we'll follow up by email.</p></div></div></article>
      <article class="faq-item"><button class="faq-q" aria-expanded="false">How does Express Service work?<span class="plus"></span></button><div class="faq-a"><div><p>Express is a single flat surcharge added once to your order total for priority handling — it's never multiplied per item, and it's always optional.</p></div></div></article>
      <article class="faq-item"><button class="faq-q" aria-expanded="false">Do you need my Roblox login?<span class="plus"></span></button><div class="faq-a"><div><p>Never your password. Orders are confirmed through Roblox's own identity sign-in, which only shares your display name, username and email with us.</p></div></div></article>
      <article class="faq-item"><button class="faq-q" aria-expanded="false">Is regional pricing available?<span class="plus"></span></button><div class="faq-a"><div><p>Approved customers get access to a dedicated regional-pricing catalogue and checkout. Reach out directly if this applies to you.</p></div></div></article>
    </div>
  </div>
</section>
<section class="ready">
  <div class="section-head" style="max-width:none"><p class="kicker"><span class="dot"></span>k3rxsene's Services</p><h2>Ready to move your account forward?</h2><p>Join over 500+ customers who've had orders completed safely and on time.</p></div>
  <div class="cta-row"><a class="btn blue" href="#games">Browse services</a></div>
</section>
${footer()}`;
  nav();initHomeFX();
}

/* ---------- catalogue pages (public + inr) ---------- */
function catalogMarkup(){
  const isInr=state.market==='inr';const heading=isInr?'Your catalogue':`${gameNames[state.game]} services`;const theme=state.game==='garden'?'garden':'';
  document.body.className=theme;
  document.body.innerHTML=`${header(isInr?'':'games')}<main id="main"><section class="catalog-hero wrap"><p class="kicker"><span class="dot"></span>${isInr?'Private access':gameNames[state.game]}</p><h1>${heading}</h1><p>${isInr?'Your approved catalogue. Add items to build an order; prices are verified by the server at submission.':'Browse the catalogue and request a rate. Add services to your request below.'}</p></section><section class="wrap catalog-layout"><div><div class="notice" style="margin-bottom:16px"><strong>${state.game==='garden'?'Availability matters.':'Service scope matters.'}</strong> ${state.game==='garden'?'Grow a Garden market items are availability-based; an item marked “Price on request” cannot be checked out until a rate is agreed.':'Some services have account-specific scope; final delivery details are confirmed after checkout.'}</div><div class="service-grid" id="serviceGrid"></div></div><aside class="cart panel"><h2>${isInr?'Your order':'Your rate request'}</h2><ul class="cart-items" id="cartItems"></ul>${isInr?`<div class="cart-summary"><div><span>Subtotal</span><b id="subtotal">₹0</b></div><div><span id="expressLabel">Express Service: Not applied</span><b id="expressPrice">—</b></div><div><strong>Total</strong><strong id="total">₹0</strong></div></div><div class="express"><label><input type="checkbox" id="express"> <span>Add Express Service <small>(+₹${state.expressSurcharge})</small></span></label><span>One priority surcharge per order. It is never multiplied by service.</span></div><button class="btn blue" style="width:100%" id="checkout">Continue to Roblox login</button>`:`<div class="field"><label for="quoteEmail">Contact email</label><input id="quoteEmail" type="email" required placeholder="you@example.com"></div><div class="field"><label for="quoteNotes">Notes (optional)</label><input id="quoteNotes" maxlength="400" placeholder="Any details we should know"></div><div class="error" id="quoteError"></div><button class="btn blue" style="width:100%" id="requestQuote">Send rate request</button>`}</aside></section></main>${footer()}<div class="modal" id="modal"></div>`;
  renderServices();renderCart();nav();
}
function renderServices(){const grid=$('#serviceGrid');grid.innerHTML=state.catalog.map(item=>`<article class="service-card"><div class="top-row"><span class="icon">${svgIcon(item.id)}</span><span class="tag">${item.tag||'Service'}</span></div><h3>${esc(item.name)}</h3><p>${esc(item.description)}</p><footer><span class="price ${item.price==null?'request':''}">${money(item.price)}</span><button class="btn ghost" data-add="${item.id}">Add</button></footer></article>`).join('');grid.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>addItem(b.dataset.add))}
function addItem(id){const item=state.catalog.find(x=>x.id===id);const existing=state.items.find(x=>x.id===id);if(existing)existing.quantity++;else state.items.push({...item,quantity:1});renderCart();toast(`${item.name} added.`)}
function renderCart(){const out=$('#cartItems');if(!out)return;const isInr=state.market==='inr';if(!state.items.length)out.innerHTML='<li class="cart-empty">No services selected yet.</li>';else out.innerHTML=state.items.map(i=>`<li class="cart-line"><span>${esc(i.name)}<small>Quantity ${i.quantity}${isInr?` · ${money(i.price)} each`:''}</small></span><span>${isInr?`<b>${money(i.price*i.quantity)}</b><br>`:''}<button aria-label="Remove ${esc(i.name)}" data-remove="${i.id}">Remove</button></span></li>`).join('');out.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{state.items=state.items.filter(i=>i.id!==b.dataset.remove);renderCart()});
  if(isInr){const subtotal=state.items.reduce((x,i)=>x+i.price*i.quantity,0), surcharge=state.express?state.expressSurcharge:0;$('#subtotal').textContent=money(subtotal);$('#total').textContent=money(subtotal+surcharge);$('#expressLabel').textContent=state.express?'Express Service: Applied':'Express Service: Not applied';$('#expressPrice').textContent=state.express?`+${money(surcharge)}`:'—';const box=$('#express');if(box){box.checked=state.express;box.onchange=()=>{state.express=box.checked;renderCart()};$('#checkout').onclick=checkout}}
  else{const btn=$('#requestQuote');if(btn)btn.onclick=requestQuote}}
function checkout(){if(!state.items.length)return toast('Add at least one service before continuing.');sessionStorage.setItem('k3order',JSON.stringify({game:state.game,items:state.items.map(i=>({id:i.id,quantity:i.quantity})),express:state.express}));location.href='/roblox-login.html'}
async function requestQuote(){const errEl=$('#quoteError');errEl.textContent='';if(!state.items.length)return errEl.textContent='Add at least one service before requesting a rate.';const email=$('#quoteEmail').value.trim();const btn=$('#requestQuote');btn.disabled=true;btn.textContent='Sending…';try{const r=await api('/api/quotes',{method:'POST',body:JSON.stringify({game:state.game,items:state.items.map(i=>({id:i.id,quantity:i.quantity})),email,notes:$('#quoteNotes').value})});state.items=[];renderCart();toast(`Request sent — reference ${r.id}. We'll reply by email with a rate.`)}catch(e){errEl.textContent=e.message}finally{btn.disabled=false;btn.textContent='Send rate request'}}
async function renderCatalog(game,market){await initSession();if(market==='inr'&&!state.session.inr){location.href='/inr-login.html?next='+encodeURIComponent(`/inr-${game==='blox'?'blox-fruits':'grow-a-garden'}.html`);return}state.game=game;state.market=market;try{const data=await api(`/api/catalog?game=${game}&market=${market||'global'}`);state.catalog=data.items;state.expressSurcharge=data.expressSurcharge||0;catalogMarkup()}catch(e){document.body.className='';document.body.innerHTML=`${header()}<main class="auth-page"><section class="auth-card panel"><h1>Catalogue unavailable</h1><p>${esc(e.message)}</p><a class="btn blue" href="/">Back home</a></section></main>`;nav()}}

/* ---------- private / hidden access — no public links point here ---------- */
function renderInrLogin(){
  document.body.className='';
  document.body.innerHTML=`${header()}<main class="auth-page" id="main"><form class="auth-card panel" id="login"><p class="kicker"><span class="dot"></span>Private access</p><h1>Client sign in</h1><p>Use the access details supplied to you directly. There is no public registration.</p><div class="field"><label for="username">Username</label><input id="username" autocomplete="username" required></div><div class="field"><label for="password">Password</label><input id="password" type="password" autocomplete="current-password" required></div><div class="error" id="error"></div><button class="btn blue" style="width:100%">Continue</button></form></main>${footer()}`;nav();
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
  document.body.innerHTML=`${header()}<main class="auth-page" id="main"><section class="auth-card panel"><p class="kicker"><span class="dot"></span>Secure checkout</p><h1>Connect your Roblox identity</h1><p>Before you can confirm an order, authenticate with Roblox. Your identity will be shown for review and only the necessary details are included with the order.</p><div id="identityArea"></div><div class="error" id="error"></div><button class="btn blue" style="width:100%" id="robloxAction">Connect with Roblox</button></section></main>${footer()}<div class="modal" id="modal"></div>`;nav();
  const action=$('#robloxAction');
  if(state.session.roblox){$('#identityArea').innerHTML=`<div class="identity"><b>${esc(state.session.roblox.displayName)}</b>@${esc(state.session.roblox.username)}<br><span>${esc(state.session.roblox.email||'No email returned by provider')}</span></div>`;action.textContent='Review and confirm order';action.onclick=()=>reviewOrder(saved)}
  else{action.onclick=()=>{if(!state.session.configured.roblox)return toast('Roblox integration has not been configured yet.');location.href='/api/roblox/start'}}
}
function reviewOrder(saved){
  const modal=$('#modal');
  modal.innerHTML=`<section class="modal-card panel"><button class="modal-close" aria-label="Close">×</button><p class="kicker"><span class="dot"></span>Review order</p><h2>Confirm your order</h2><div id="reviewLines"></div><div class="express"><strong>Express Service: ${saved.express?`Applied (+₹${state.expressSurcharge})`:'Not applied'}</strong></div><div class="error" id="reviewError"></div><button class="btn blue" style="width:100%" id="confirm">Submit secure order</button></section>`;
  modal.classList.add('show');$('.modal-close',modal).onclick=()=>modal.classList.remove('show');
  const found=saved.items.map(x=>({...state.catalog.find(i=>i.id===x.id),quantity:x.quantity}));
  const subtotal=found.reduce((x,i)=>x+i.price*i.quantity,0),sur=saved.express?state.expressSurcharge:0;
  $('#reviewLines').innerHTML=found.map(i=>`<div class="cart-line"><span>${esc(i.name)} ×${i.quantity}</span><b>${money(i.price*i.quantity)}</b></div>`).join('')+`<div class="cart-summary"><div><span>Subtotal</span><b>${money(subtotal)}</b></div><div><strong>Total</strong><strong>${money(subtotal+sur)}</strong></div></div>`;
  $('#confirm').onclick=async()=>{const b=$('#confirm');b.disabled=true;b.textContent='Submitting…';try{const r=await api('/api/orders',{method:'POST',body:JSON.stringify(saved)});sessionStorage.removeItem('k3order');modal.innerHTML=`<section class="modal-card panel"><p class="kicker"><span class="dot"></span>Order received</p><h2>Thank you — ${esc(r.order.id)}</h2><p>Your order total is ${money(r.order.total)}. We've securely recorded the request and will confirm fulfilment details with you.</p><a class="btn blue" href="/inr.html">Back to catalogue</a></section>`}catch(e){$('#reviewError').textContent=e.message;b.disabled=false;b.textContent='Submit secure order'}}
}

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
  location.href='/';
}
boot();
