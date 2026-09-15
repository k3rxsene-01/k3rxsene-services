const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { URL } = require('url');

loadEnv(path.join(__dirname, '.env'));
const PORT = Number(process.env.PORT || 3000);
const SECRET = process.env.SESSION_SECRET;

if (process.env.NODE_ENV === "production" && (!SECRET || SECRET.length < 32)) {
  throw new Error("SESSION_SECRET must be configured with 32+ characters in production.");
}

const sessions = new Map();
const loginAttempts = new Map();
const quoteAttempts = new Map();
const now = () => Date.now();
if (process.env.NODE_ENV === 'production' && (!process.env.SESSION_SECRET || SECRET.length < 32)) throw new Error('SESSION_SECRET must be configured with 32+ characters in production.');
// Catalog rows: [id, name, description, price, tag, eta, featured]
// price:null means the item is availability/quote-based and cannot be checked out directly (INR quote flow only).
const catalog = {
  blox: [
    ['leveling', 'Leveling up', 'Level grinding tailored to your current sea and build.', 2200, 'Popular', '1–2 days', true],
    ['race-v4', 'Race V4 training', 'One race: trials, gears and training progression.', 1200, '', '4–8 hrs', false],
    ['raids', 'Raids & Fragments', 'Raid carries and fragment farming. Quantity available.', 100, 'Per 1,000 frags', '2–6 hrs', true],
    ['bounty', 'Bounty / Honor farming', 'Build PvP standing and work toward title achievements.', 400, 'Per 1M', '3–6 hrs', false],
    ['mirage', 'Mirage Island + Gear', 'Mirage hunt and gear acquisition for the V4 path.', 1800, '', '6–12 hrs', false],
    ['ghoul', 'Ghoul Race', 'Unlock the Ghoul race.', 300, '', '2–4 hrs', false],
    ['cyborg', 'Cyborg Race', 'Unlock the Cyborg race.', 520, '', '3–5 hrs', false],
    ['ttk', 'True Triple Katana', 'Targeted sword collection; mastery can be scoped in consultation.', 1100, '', '4–10 hrs', false],
    ['ttk-mastery', 'True Triple Katana + Mastery', 'True Triple Katana collection with mastery grind.', 1700, 'Full mastery', '1–2 days', false],
    ['soul-guitar', 'Soul Guitar', 'Mythical Soul Guitar unlock.', 850, '', '3–6 hrs', false],
    ['soul-guitar-mastery', 'Soul Guitar + Mastery', 'Soul Guitar unlock with mastery grind.', 1400, 'Full mastery', '8–14 hrs', false],
    ['beli', 'Money / Beli Grind', 'Beli farming for fruit purchases and upgrades.', 100, 'Per 1M Beli', '2–4 hrs', true],
    ['recovery', 'Account Credential Reset', 'Access recovery assistance for your own locked account.', 450, 'Own account only', '1–3 hrs', false],
    ['sword', 'Any Sword Unlock', 'Focused farming for a specific missing sword.', 450, 'From', '2–8 hrs', false]
    ,['fruit-blizzard', 'Physical Blizzard fruit', 'Legendary physical fruit market item.', 400, 'Market item', 'Confirmed after order', false]
    ,['fruit-buddha', 'Physical Buddha fruit', 'Legendary physical fruit market item.', 800, 'Market item', 'Confirmed after order', false]
    ,['fruit-portal', 'Physical Portal fruit', 'Legendary physical fruit market item.', 800, 'Market item', 'Confirmed after order', false]
    ,['fruit-lightning', 'Physical Lightning fruit', 'Legendary physical fruit market item.', 1500, 'Market item', 'Confirmed after order', false]
    ,['fruit-dough', 'Physical Dough fruit', 'Mythical physical fruit market item.', 1500, 'Market item', 'Confirmed after order', false]
    ,['fruit-gas', 'Physical Gas fruit', 'Mythical physical fruit market item.', 2000, 'Market item', 'Confirmed after order', false]
    ,['fruit-control', 'Physical Control fruit', 'Mythical physical fruit market item.', 2800, 'Market item', 'Confirmed after order', false]
    ,['fruit-kitsune', 'Physical Kitsune fruit', 'Mythical physical fruit market item.', 4800, 'Market item', 'Confirmed after order', false]
    ,['fruit-dragon-east', 'Physical Dragon East fruit', 'Unstable-market mythical physical fruit.', 6500, 'Unstable market', 'Confirmed after order', false]
    ,['fruit-dragon-west', 'Physical Dragon West fruit', 'Unstable-market mythical physical fruit.', 7000, 'Unstable market', 'Confirmed after order', false]
  ],
  garden: [
    ['ember-lily', 'Ember Lily seeds', 'High-value seed order. Availability is confirmed before fulfilment.', 180, 'Availability-based', 'Confirmed after order', true],
    ['sugar-apple', 'Sugar Apple seeds', 'Desirable high-tier seed bundle.', 140, 'Availability-based', 'Confirmed after order', false],
    ['sprinkler', 'Master Sprinkler', 'Premium growth support item; stock-dependent.', 120, '', '1–2 days', false],
    ['godly-sprinkler', 'Godly Sprinkler', 'Top-tier sprinkler request.', 260, 'Availability-based', 'Confirmed after order', false],
    ['raccoon', 'Raccoon pet', 'High-demand pet order, subject to market availability.', 500, 'Market item', 'Confirmed after order', true],
    ['dragonfly', 'Dragonfly pet', 'High-value pet request.', 360, 'Market item', 'Confirmed after order', false],
    ['sheckles', 'Sheckles bundle', 'Currency service; choose a quantity in your order notes.', 90, 'Per 1M', '2–4 hrs', false],
    ['event', 'Event / limited item', 'Request an event item or valuable seasonal collectible.', null, 'Price on request', 'Confirmed by email', false]
  ]
};
const expressSurcharge = 200;
const ROBLOX_AUTHORIZE_URL = 'https://apis.roblox.com/oauth/v1/authorize';
const ROBLOX_TOKEN_URL = 'https://apis.roblox.com/oauth/v1/token';
const ROBLOX_USERINFO_URL = 'https://apis.roblox.com/oauth/v1/userinfo';
function robloxConfigured() { return Boolean(process.env.ROBLOX_CLIENT_ID && process.env.ROBLOX_CLIENT_SECRET); }

function loadEnv(file) { if (!fs.existsSync(file)) return; for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) { const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, ''); } }
function send(res, status, body, type='application/json') { res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options':'nosniff', 'X-Frame-Options':'DENY', 'Referrer-Policy':'strict-origin-when-cross-origin', 'Content-Security-Policy':"default-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self'; connect-src 'self'; base-uri 'self'; frame-ancestors 'none'" }); res.end(type === 'application/json' ? JSON.stringify(body) : body); }
function readJson(req) { return new Promise((resolve, reject) => { let raw=''; req.on('data', c => { raw += c; if (raw.length > 1e6) reject(new Error('Request too large')); }); req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch { reject(new Error('Invalid request')); } }); }); }
function parseCookies(req) { return Object.fromEntries((req.headers.cookie || '').split(';').map(x=>x.trim().split('=').map(decodeURIComponent)).filter(x=>x.length===2)); }
function user(req) { const id=parseCookies(req).sid; const session=id && sessions.get(id); if (!session || session.expires < now()) return null; return session; }
function makeSession(res, attributes={}) { const id=crypto.randomBytes(32).toString('hex'); const session={ expires:now()+1000*60*60*12, ...attributes }; sessions.set(id, session); res.setHeader('Set-Cookie', `sid=${id}; HttpOnly; SameSite=Lax; Path=/; Max-Age=43200${process.env.NODE_ENV==='production'?'; Secure':''}`); return session; }
function safeEqual(a,b) { const aa=Buffer.from(String(a||'')), bb=Buffer.from(String(b||'')); return aa.length===bb.length && crypto.timingSafeEqual(aa,bb); }
function cleanIdentityText(value) { return String(value||'').replace(/[<>]/g,'').slice(0,120); }
function loginAllowed(req) { const key=req.socket.remoteAddress||'unknown'; const record=loginAttempts.get(key)||{count:0,until:0}; if(record.until>now()) return false; if(record.until && record.until<=now()) loginAttempts.delete(key); return true; }
function recordLoginFailure(req) { const key=req.socket.remoteAddress||'unknown'; const record=loginAttempts.get(key)||{count:0,until:0}; record.count++; if(record.count>=5){record.count=0;record.until=now()+15*60*1000} loginAttempts.set(key,record); }
function rateLimited(map, key, limit, windowMs) { const record=map.get(key)||{count:0,resetAt:now()+windowMs}; if(record.resetAt<now()){record.count=0;record.resetAt=now()+windowMs} record.count++; map.set(key,record); return record.count>limit; }
const EMAIL_RE=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function validateQuoteRequest(body) {
  const game = body.game; if (!catalog[game]) throw new Error('Choose a valid game.');
  if (!Array.isArray(body.items) || !body.items.length) throw new Error('Select at least one service.');
  const valid = new Map(catalog[game].map(x=>[x[0],x])); const items=[];
  for (const item of body.items) { const found=valid.get(item && item.id); if (!found) throw new Error('Your selection contains an unavailable service.'); const qty=Number(item.quantity); if(!Number.isInteger(qty) || qty < 1 || qty > 99) throw new Error('Every service quantity must be a whole number from 1 to 99.'); items.push({id:found[0],name:found[1],quantity:qty}); }
  const email = String(body.email||'').trim().slice(0,190); if (!EMAIL_RE.test(email)) throw new Error('Enter a valid contact email so we can send you a rate.');
  const notes = cleanIdentityText(body.notes).slice(0,400);
  return { id:`Q-${crypto.randomUUID().slice(0,8).toUpperCase()}`, game, items, email, notes, createdAt:new Date().toISOString() };
}
async function sendQuoteWebhook(quote) { const url=process.env.DISCORD_WEBHOOK_URL; if (!url) return; const lines=quote.items.map(i=>`• ${i.name} ×${i.quantity}`).join('\n'); const content=`**Quote request ${quote.id}**\nGame: ${quote.game === 'blox' ? 'Blox Fruits' : 'Grow a Garden'}\nContact: ${quote.email}\n\n${lines}\n${quote.notes ? `\nNotes: ${quote.notes}` : ''}\nTimestamp: ${quote.createdAt}`;
  const response=await fetch(url, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({content})}); if(!response.ok) throw new Error('Your request could not be delivered. Please try again.');
}
function publicCatalog(game) { return (catalog[game] || []).map(([id,name,description,,tag,eta,featured]) => ({id,name,description,tag,eta,featured:Boolean(featured),price:null})); }
function inrCatalog(game) { return (catalog[game] || []).map(([id,name,description,price,tag,eta,featured]) => ({id,name,description,tag,eta,featured:Boolean(featured),price})); }
function findCatalogItem(game, id) { const row=(catalog[game]||[]).find(r=>r[0]===id); if(!row) return null; const [rid,name,description,price,tag,eta,featured]=row; return {id:rid,name,description,tag,eta,featured:Boolean(featured),price}; }
function validateOrder(body, session) {
  const game = body.game; if (!catalog[game]) throw new Error('Choose a valid game.');
  if (!Array.isArray(body.items) || !body.items.length) throw new Error('Add at least one service.');
  const valid = new Map(catalog[game].map(x=>[x[0],x])); let items=[]; let subtotal=0;
  for (const item of body.items) { const found=valid.get(item.id); if (!found) throw new Error('Your cart contains an unavailable service.'); const qty=Number(item.quantity); if(!Number.isInteger(qty) || qty < 1 || qty > 99) throw new Error('Every service quantity must be a whole number from 1 to 99.'); if (!found[3]) throw new Error(`${found[1]} requires a quote before checkout.`); const line=found[3]*qty; subtotal+=line; items.push({id:found[0],name:found[1],quantity:qty,unitPrice:found[3],lineTotal:line}); }
  const express=Boolean(body.express); const surcharge=express?expressSurcharge:0;
  const notes=cleanIdentityText(body.notes).slice(0,400);
  return { id:`K3-${crypto.randomUUID().slice(0,8).toUpperCase()}`, game, items, subtotal, express, surcharge, total:subtotal+surcharge, notes, customer:session.roblox, createdAt:new Date().toISOString() };
}
async function sendWebhook(order) { const url=process.env.DISCORD_WEBHOOK_URL; if (!url) return; const lines=order.items.map(i=>`• ${i.name} ×${i.quantity} — ₹${i.lineTotal}`).join('\n'); const content=`**Order ${order.id}**\n**Customer**\nDisplay Name: ${order.customer.displayName}\nUsername: ${order.customer.username}\nRoblox user ID: ${order.customer.userId || 'Unknown'}\nEmail: ${order.customer.email || 'Not provided'}\n\n**Order**\nGame: ${order.game === 'blox' ? 'Blox Fruits' : 'Grow a Garden'}\n${lines}\n\nSubtotal: ₹${order.subtotal}\nExpress Service: ${order.express ? `Applied (+₹${order.surcharge})` : 'Not applied'}\nTotal: ₹${order.total}\n${order.notes ? `Customer notes: ${order.notes}\n` : ''}Timestamp: ${order.createdAt}`;
  const response=await fetch(url, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({content})}); if(!response.ok) throw new Error('Order delivery could not be confirmed. Please try again.');
}
function staticFile(res, pathname) { let file=pathname==='/'?'/index.html':pathname; const root=path.resolve(__dirname,'public'); const candidate=path.resolve(root,'.'+file); const allowed=(candidate===root || candidate.startsWith(root+path.sep)) ? candidate : null; if (!allowed || !fs.existsSync(allowed) || fs.statSync(allowed).isDirectory()) return false; const ext=path.extname(allowed); const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'}; send(res,200,fs.readFileSync(allowed),types[ext]||'application/octet-stream'); return true; }
const server=http.createServer(async(req,res)=>{ const url=new URL(req.url,`http://${req.headers.host}`); try {
  if (req.method === "GET" && url.pathname === "/health") { return send(res, 200, { status: "ok" }); }
  if (req.method==='GET' && url.pathname==='/api/session') { const s=user(req); return send(res,200,{inr:Boolean(s?.inr),roblox:s?.roblox||null,configured:{roblox:robloxConfigured()}}); }
  if (req.method==='POST' && url.pathname==='/api/inr/login') { if(!loginAllowed(req)) return send(res,429,{error:'Too many failed attempts. Please wait 15 minutes.'}); const b=await readJson(req); if (!process.env.INR_USERNAME || !process.env.INR_PASSWORD) return send(res,503,{error:'INR access is not configured yet.'}); if (!safeEqual(b.username,process.env.INR_USERNAME)||!safeEqual(b.password,process.env.INR_PASSWORD)){recordLoginFailure(req);return send(res,401,{error:'Those INR access details are not recognised.'});} loginAttempts.delete(req.socket.remoteAddress||'unknown'); makeSession(res,{inr:true}); return send(res,200,{ok:true}); }
  if (req.method==='POST' && url.pathname==='/api/logout') { res.setHeader('Set-Cookie','sid=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0'); return send(res,200,{ok:true}); }
  if (req.method==='GET' && url.pathname==='/api/catalog') { const game=url.searchParams.get('game'); const market=url.searchParams.get('market'); if (!catalog[game]) return send(res,404,{error:'Unknown game.'}); const s=user(req); if (market==='inr' && !s?.inr) return send(res,403,{error:'INR access is required.'}); return send(res,200,{items:market==='inr'?inrCatalog(game):publicCatalog(game), expressSurcharge:market==='inr'?expressSurcharge:null}); }
  if (req.method==='GET' && url.pathname==='/api/catalog/item') { const game=url.searchParams.get('game'); const id=url.searchParams.get('id'); if (!catalog[game]) return send(res,404,{error:'Unknown game.'}); const s=user(req); const isInr=Boolean(s?.inr); const item=findCatalogItem(game,id); if(!item) return send(res,404,{error:'That service could not be found.'}); if(!isInr) item.price=null; return send(res,200,{item,expressSurcharge:isInr?expressSurcharge:null}); }
  if (req.method==='POST' && url.pathname==='/api/roblox/disconnect') { const s=user(req); if (s) delete s.roblox; return send(res,200,{ok:true}); }
  if (req.method==='GET' && url.pathname==='/api/roblox/start') {
    if (!robloxConfigured()) return send(res,503,{error:'Roblox authentication has not been configured yet.'});
    let s=user(req); if (!s) s=makeSession(res,{}); s.robloxState=crypto.randomBytes(24).toString('hex'); s.robloxNonce=crypto.randomBytes(24).toString('hex');
    const auth=new URL(ROBLOX_AUTHORIZE_URL); auth.searchParams.set('client_id',process.env.ROBLOX_CLIENT_ID); auth.searchParams.set('redirect_uri',`${process.env.APP_ORIGIN||`http://${req.headers.host}`}/api/roblox/callback`); auth.searchParams.set('scope','openid profile'); auth.searchParams.set('response_type','code'); auth.searchParams.set('state',s.robloxState); auth.searchParams.set('nonce',s.robloxNonce);
    res.writeHead(302,{Location:auth.toString()}); return res.end();
  }
  if (req.method==='GET' && url.pathname==='/api/roblox/callback') {
    const s=user(req); const code=url.searchParams.get('code'); if(!s || !code || !safeEqual(url.searchParams.get('state'),s.robloxState)) return send(res,400,{error:'Roblox login could not be verified. Please start again.'});
    const tokenBody=new URLSearchParams({grant_type:'authorization_code',code,client_id:process.env.ROBLOX_CLIENT_ID,client_secret:process.env.ROBLOX_CLIENT_SECRET});
    const tokenResponse=await fetch(ROBLOX_TOKEN_URL,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:tokenBody}); const tokens=await tokenResponse.json().catch(()=>({}));
    if(!tokenResponse.ok || !tokens.access_token) return send(res,401,{error:'Roblox identity verification failed.'});
    const userinfoResponse=await fetch(ROBLOX_USERINFO_URL,{headers:{Authorization:`Bearer ${tokens.access_token}`}}); const identity=await userinfoResponse.json().catch(()=>({}));
    if(!userinfoResponse.ok || !identity.sub || !identity.preferred_username) return send(res,401,{error:'Roblox identity verification failed.'});
    s.roblox={displayName:cleanIdentityText(identity.name||identity.nickname||identity.preferred_username),username:cleanIdentityText(identity.preferred_username),email:'',userId:cleanIdentityText(identity.sub)}; delete s.robloxState; delete s.robloxNonce; res.writeHead(302,{Location:'/roblox-login.html'}); return res.end();
  }
  if (req.method==='POST' && url.pathname==='/api/quotes') { const key=req.socket.remoteAddress||'unknown'; if(rateLimited(quoteAttempts,key,5,10*60*1000)) return send(res,429,{error:'Too many requests. Please wait a few minutes and try again.'}); const quote=validateQuoteRequest(await readJson(req)); await sendQuoteWebhook(quote); return send(res,201,{ok:true,id:quote.id}); }
  if (req.method==='POST' && url.pathname==='/api/orders') { const s=user(req); if (!s?.inr) return send(res,403,{error:'Sign in to INR access before placing an INR order.'}); if (!s.roblox) return send(res,401,{error:'Authenticate with Roblox before confirming your order.'}); const order=validateOrder(await readJson(req),s); await sendWebhook(order); return send(res,201,{ok:true,order:{id:order.id,total:order.total}}); }
  if (req.method==='GET' && staticFile(res,url.pathname)) return;
  send(res,404,{error:'Not found'});
 } catch(e) { console.error(e); send(res,500,{error:e.message==='Invalid request'?e.message:'Something went wrong. Please try again.'}); } });
server.listen(PORT, "0.0.0.0", () => {
  console.log(`k3rxsene's Services running on 0.0.0.0:${PORT}`);
});