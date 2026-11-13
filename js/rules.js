// ---------- game state & rules ----------
let G = null;
const H = id => G.hexes[id], V = id => G.verts[id], E = id => G.edges[id];
const cur = () => G.P[G.turn];
const players = () => G.P.filter(p => !p.barb);
const myHexes = pid => G.hexes.filter(h => h.owner === pid);
const myTowns = pid => G.verts.filter(v => v.town && v.town.owner === pid);
const stotal = s => RES.reduce((t, r) => t + s[r], 0);
const canPay = (s, c) => Object.entries(c).every(([r, n]) => s[r] >= n);
const payS = (s, c) => { for (const [r, n] of Object.entries(c)) s[r] -= n };
const touches = (v, type) => v.hexes.some(h => H(h).type === type);
const isCoast = v => v.hexes.length < 3;
const maxPop = v => CFG.maxPop + (touches(v, 'fields') ? CFG.granaryPopBonus : 0);
const milMax = v => v.town.pop + (touches(v, 'forest') ? CFG.palisadeMilitia : 0) + (v.town.walls ? CFG.wallMilitia : 0);
const vp = p => myTowns(p.id).reduce((s, v) => s + v.town.pop, 0) + Math.floor(myHexes(p.id).length / Math.max(1, CFG.hexesPerVP));
const hexDist = (a, b) => (Math.abs(a.q - b.q) + Math.abs(a.r - b.r) + Math.abs(a.q + a.r - b.q - b.r)) / 2;
const hexName = h => TERR[h.type].name + (h.num ? ' ' + h.num : '');
const vb = (p, verb) => p.id === 0 ? verb : (/(s|sh|ch|x)$/.test(verb) ? verb + 'es' : verb + 's');
const sleep = ms => new Promise(r => setTimeout(r, ms * G.speed));
function log(msg, pid) { G.log.unshift({ msg, pid }); if (G.log.length > 160) G.log.pop() }
function randRes(s) { let t = rnd(stotal(s)); for (const r of RES) { if (t < s[r]) return r; t -= s[r] } return RES[0] }
const stockText = s => RES.filter(r => s[r]).map(r => `${s[r]}${ic(r)}`).join(' ') || 'nothing';
const banned = (pid, k, id) => G.bans.some(b => b.pid === pid && b.k === k && b.id === id);

function newGameState(nAI, speed) {
  const b = genBoard();
  G = { ...b, P: [], turn: 0, round: 1, phase: 'setup', sel: null, mode: null, dice: null, lastRoll: null, log: [], over: false, busy: false, bans: [], speed, autoplay: false, seed: rnd(1e6), flash: null, used: new Set() };
  const n = nAI + 1;
  for (let i = 0; i < n; i++) G.P.push({ id: i, name: PCOL[i].n, color: PCOL[i].c, dark: PCOL[i].d, ai: i > 0, alive: true, pool: 0 });
  G.P.push({ id: n, name: 'Barbarians', color: '#51463c', dark: '#241d18', barb: true, alive: true, pool: 0 });
  G.barb = n; G.n = n;
  const cands = shuffle(G.hexes.filter(h => h.type === 'desert')).concat(shuffle(G.hexes.filter(h => h.type !== 'desert')));
  const placed = [];
  for (const c of cands) {
    if (placed.length >= CFG.barbarianCamps) break;
    if (placed.some(p => hexDist(p, c) < 2)) continue;
    c.owner = G.barb; c.armies = ri(CFG.barbMin, CFG.barbMax);
    for (let k = ri(1, CFG.barbLootMax); k > 0; k--) c.stock[RES[rnd(5)]]++;
    placed.push(c);
  }
  const order = shuffle([...Array(n).keys()]);
  G.setup = { order: [...order, ...order.slice().reverse()], i: 0, stage: 'town', v: null };
  G.first = order[0];
}

// ----- towns
function themeOf(v) {
  const cnt = {}; v.hexes.forEach(id => { const t = H(id).type; cnt[t] = (cnt[t] || 0) + 1 });
  return ['mountain', 'forest', 'hills', 'fields', 'pasture', 'desert'].sort((a, b) => (cnt[b] || 0) - (cnt[a] || 0))[0];
}
function mkTown(v, pid) {
  const th = themeOf(v), pool = THEME[th].names.filter(n => !G.used.has(n));
  const name = pool.length ? pool[rnd(pool.length)] : 'Fort ' + (G.used.size + 1); G.used.add(name);
  v.town = { owner: pid, pop: 1, mil: 0, walls: false, stock: emptyStock(), sent: 0, name, theme: th, fed: 100 };
  v.town.mil = milMax(v);
}
const ridgeCount = v => v.edges.filter(e => E(e).ridge).length;
const validSpot = v => !v.town && v.adj.every(a => !V(a).town) && ridgeCount(v) < 2;
function traits(v) {
  const t = [];
  if (touches(v, 'mountain')) t.push(['Stone keep', `militia +${CFG.keepBonus} on best die`]);
  if (touches(v, 'forest')) t.push(['Palisade', `+${CFG.palisadeMilitia} militia`]);
  if (touches(v, 'fields')) t.push(['Granary', `max size +${CFG.granaryPopBonus}`]);
  if (touches(v, 'hills')) t.push(['Brickworks', `walls and roads cost ${CFG.brickworksDiscount} less brick`]);
  if (touches(v, 'pasture')) t.push(['Stables', `convoys reach +${CFG.pastureConvoyBonus}`]);
  if (isCoast(v)) t.push(['Harbor', `bank trades ${CFG.harborRate}:1`]);
  return t;
}
const tradeRate = v => isCoast(v) ? CFG.harborRate : CFG.bankRate;
const campYield = h => Math.min(CFG.campMaxYield, CFG.campBaseYield + Math.floor((h.armies - 1) / Math.max(1, CFG.campSoldiersPerExtra)));

// ----- supply lines: a camp next to one of its towns, or on a hex whose road leads to one, shares that town's stores
const farmable = h => h.type === 'fields' || h.type === 'pasture';
function townZone(v) {
  const pid = v.town.owner, hs = new Set(v.hexes), seen = new Set([v.id]), q = [v];
  while (q.length) {
    const u = q.shift();
    u.edges.forEach(eid => {
      const e = E(eid); if (!e.road) return; e.hexes.forEach(h => hs.add(h));
      const o = V(e.v[0] === u.id ? e.v[1] : e.v[0]); if (seen.has(o.id) || (o.town && o.town.owner !== pid)) return; seen.add(o.id); q.push(o);
    });
  }
  return hs;
}
function zoneMap(pid) {
  const m = new Map(), towns = myTowns(pid);
  towns.forEach(v => v.hexes.forEach(h => { if (!m.has(h)) m.set(h, v.id) }));
  towns.forEach(v => townZone(v).forEach(h => { if (!m.has(h)) m.set(h, v.id) }));
  return m;
}
function linkOf(h) { if (h.owner < 0 || h.owner === G.barb) return null; const l = zoneMap(h.owner).get(h.id); return l === undefined ? null : l }
const campStore = h => { const l = linkOf(h); return l === null ? h.stock : V(l).town.stock };
// towns of one player joined by road pool their stores into a single shared stock
function townGroups(pid) {
  const done = new Set(), groups = [];
  myTowns(pid).forEach(v => {
    if (done.has(v.id)) return; const g = [], q = [v], seen = new Set([v.id]);
    while (q.length) {
      const u = q.shift(); if (u.town && u.town.owner === pid && !done.has(u.id)) { done.add(u.id); g.push(u) }
      u.edges.forEach(eid => { const e = E(eid); if (!e.road) return; const o = V(e.v[0] === u.id ? e.v[1] : e.v[0]); if (seen.has(o.id) || (o.town && o.town.owner !== pid)) return; seen.add(o.id); q.push(o) });
    }
    groups.push(g);
  });
  return groups;
}
const sharers = v => G.verts.filter(o => o.town && o.id !== v.id && o.town.stock === v.town.stock);
function splitTown(v) { // a town leaving the pool takes an even share with it
  const others = sharers(v); if (!others.length) return; const pool = v.town.stock, mine = emptyStock();
  RES.forEach(r => { mine[r] = Math.floor(pool[r] / (others.length + 1)); pool[r] -= mine[r] }); v.town.stock = mine;
}
function syncLinks() {
  players().forEach(p => {
    townGroups(p.id).forEach(g => {
      const objs = [...new Set(g.map(v => v.town.stock))]; if (objs.length < 2) return;
      const pool = emptyStock(); objs.forEach(o => RES.forEach(r => pool[r] += o[r])); g.forEach(v => v.town.stock = pool);
      log(`${g.map(v => v.town.name).join(' and ')} are joined by road and now share their stores`, p.id);
    });
    const zm = zoneMap(p.id);
    myHexes(p.id).forEach(h => { const l = zm.get(h.id); if (l !== undefined && stotal(h.stock)) { const t = V(l).town.stock; RES.forEach(r => { t[r] += h.stock[r]; h.stock[r] = 0 }) } });
  });
  // townspeople gather whatever lies on unheld land next to their town
  G.hexes.forEach(h => {
    if (h.owner !== -1 || !stotal(h.stock)) return; const ts = h.vs.map(V).filter(v => v.town); if (!ts.length) return;
    const top = Math.max(...ts.map(v => v.town.pop)), c = ts.filter(v => v.town.pop === top), t = c[rnd(c.length)].town;
    RES.forEach(r => { t.stock[r] += h.stock[r]; h.stock[r] = 0 });
  });
}
const totalGoods = pid => [...new Set([...myTowns(pid).map(v => v.town.stock), ...myHexes(pid).map(h => h.stock)])].reduce((s, o) => s + stotal(o), 0);
// one entry per separate stockpile: town pools, then camps beyond the supply lines
function stockpiles(pid) {
  const zm = zoneMap(pid), m = new Map();
  myTowns(pid).forEach(v => { if (!m.has(v.town.stock)) m.set(v.town.stock, { stock: v.town.stock, towns: [], hd: { k: 't', id: v.id } }); m.get(v.town.stock).towns.push(v) });
  return [...m.values(), ...myHexes(pid).filter(h => !zm.has(h.id)).map(h => ({ stock: h.stock, towns: [], hd: { k: 'c', id: h.id } }))];
}
function claimHex(h, pid) { if (h.owner !== pid) { h.owner = pid; h.fed = 100; h.tired = 0 } h.claimed = true }
const townFarm = v => [...townZone(v)].some(id => { const h = H(id); return farmable(h) && (h.owner === -1 || h.owner === v.town.owner) });
const foodNeed = (n, rate) => Math.ceil(n * rate - 1e-9);
const foodIn = s => s.wheat + s.sheep;
function eat(s, need) { let got = 0; while (got < need) { const r = s.wheat >= s.sheep ? 'wheat' : 'sheep'; if (s[r] <= 0) break; s[r]--; got++ } return got }

// ----- holdings (a town or an army camp); a camp on a supply line uses its town's stock
const sameH = (a, b) => a && b && a.k === b.k && a.id === b.id;
const rawStock = hd => hd.k === 't' ? V(hd.id).town.stock : H(hd.id).stock;
const hStock = hd => hd.k === 't' ? V(hd.id).town.stock : campStore(H(hd.id));
const hObj = hd => hd.k === 't' ? V(hd.id).town : H(hd.id);
const hOwner = hd => hd.k === 't' ? (V(hd.id).town ? V(hd.id).town.owner : -1) : H(hd.id).owner;
const hName = hd => hd.k === 't' ? V(hd.id).town.name : 'the ' + hexName(H(hd.id)) + ' camp';
const holdings = pid => [...myTowns(pid).map(v => ({ k: 't', id: v.id })), ...myHexes(pid).map(h => ({ k: 'c', id: h.id }))];
function storeHoldings(pid) { const zm = zoneMap(pid); return [...myTowns(pid).map(v => ({ k: 't', id: v.id })), ...myHexes(pid).filter(h => !zm.has(h.id)).map(h => ({ k: 'c', id: h.id }))] }
const hHexes = (hd, pid) => hd.k === 'c' ? [hd.id] : V(hd.id).hexes.filter(id => { const o = H(id).owner; return o === -1 || o === pid });

// ----- movement
const roaded = h => h.es.some(e => E(e).road);
function stepCost(a, b, e) { if (e.ridge) return Infinity; let c = b.type === 'forest' ? CFG.forestMoveCost : 1; if (roaded(a) && roaded(b)) c /= Math.max(1, CFG.roadMult); return c }
function reach(starts, budget, pid) {
  const dist = new Map(), done = new Set(); starts.forEach(s => dist.set(s, 0));
  for (; ;) {
    let u = -1, du = Infinity; dist.forEach((d, k) => { if (!done.has(k) && d < du) { du = d; u = k } });
    if (u < 0) break; done.add(u); const a = H(u);
    for (let i = 0; i < 6; i++) {
      const nb = a.nb[i]; if (nb < 0) continue; const b = H(nb); if (b.owner !== -1 && b.owner !== pid) continue;
      const nd = du + stepCost(a, b, E(a.es[i])); if (nd <= budget + 1e-9 && nd < (dist.has(nb) ? dist.get(nb) : Infinity)) dist.set(nb, nd);
    }
  }
  return dist;
}
function troopReach(A) { const d = reach([A.id], CFG.troopMove + (A.type === 'pasture' ? CFG.pastureMoveBonus : 0), A.owner); d.delete(A.id); return d }
const movable = A => Math.max(0, A.armies - A.tired);
// what a departing group packs by default: nothing if it stays on a supply line, otherwise rations (or its share of the camp's stock)
function defaultCarry(A, B, n) {
  const c = emptyStock(), pid = A.owner, zm = zoneMap(pid), src = campStore(A);
  if (zm.has(B.id)) return c;
  if (!zm.has(A.id)) { RES.forEach(r => c[r] = n >= A.armies ? src[r] : Math.floor(src[r] * n / A.armies)); return c }
  if (farmable(B)) return c;
  let need = foodNeed(n, CFG.foodPerSoldier) * CFG.rationTurns; const tmp = { ...src };
  while (need-- > 0) { const r = tmp.wheat >= tmp.sheep ? 'wheat' : 'sheep'; if (tmp[r] <= 0) break; tmp[r]--; c[r]++ }
  return c;
}
function moveArmy(A, B, n, carry) {
  const pid = A.owner, src = campStore(A), pack = emptyStock(); carry = carry || defaultCarry(A, B, n);
  RES.forEach(r => { const k = Math.max(0, Math.min(src[r], carry[r] || 0)); src[r] -= k; pack[r] = k });
  const found = B.owner === -1 ? stotal(B.stock) : 0;
  if (B.owner === pid && B.armies > 0) B.fed = (B.fed * B.armies + A.fed * n) / (B.armies + n); else { B.fed = A.fed; B.tired = 0 }
  B.owner = pid; B.claimed = true; B.armies += n; B.tired += n; A.armies -= n; RES.forEach(r => B.stock[r] += pack[r]);
  if (A.armies <= 0) { A.owner = -1; A.armies = 0; A.tired = 0 } else A.tired = Math.min(A.tired, A.armies);
  if (found) log(`${G.P[pid].name} ${vb(G.P[pid], 'claim')} ${hexName(B)} and ${vb(G.P[pid], 'gather')} the ${found} resources lying there`, pid);
  syncLinks();
}
function convoyTargets(hd) {
  const pid = hOwner(hd), st = hHexes(hd, pid); if (!st.length) return [];
  const d = reach(st, CFG.convoyRange + (st.some(id => H(id).type === 'pasture') ? CFG.pastureConvoyBonus : 0), pid);
  return storeHoldings(pid).filter(o => !sameH(o, hd) && rawStock(o) !== rawStock(hd) && hHexes(o, pid).some(id => d.has(id)));
}
function sendConvoy(from, to, amt) {
  const a = rawStock(from), b = rawStock(to); let n = 0; if (a === b) return false;
  RES.forEach(r => { const k = Math.min(a[r], amt[r] || 0); a[r] -= k; b[r] += k; n += k });
  if (!n) return false; hObj(from).sent++;
  const p = G.P[hOwner(from)]; log(`${p.name} ${vb(p, 'send')} a convoy of ${n} from ${hName(from)} to ${hName(to)}`, p.id); return true;
}

// ----- building
function costOf(kind, hd, edge) {
  const c = { ...CFG.cost[kind] }, v = hd && hd.k === 't' ? V(hd.id) : null;
  if (kind === 'grow') for (const r in c) c[r] = Math.ceil(c[r] * v.town.pop * CFG.growCostScale);
  if (v && (kind === 'walls' || kind === 'road') && touches(v, 'hills') && c.brick) c.brick = Math.max(0, c.brick - CFG.brickworksDiscount);
    for (const r in c) if (!c[r]) delete c[r];
  return c;
}
const roadEdges = hd => (hd.k === 't' ? V(hd.id).edges : H(hd.id).es).map(E).filter(e => !e.road && !e.ridge);
const townSpots = h => h.vs.map(V).filter(validSpot);
const recruitHexes = (v, pid) => v.hexes.map(H).filter(h => h.owner === -1 || h.owner === pid);
function musterHexes(pid) { const s = new Set(); myTowns(pid).forEach(v => recruitHexes(v, pid).forEach(h => s.add(h.id))); return [...s].map(H) }
function doGrow(v) {
  const t = v.town, c = costOf('grow', { k: 't', id: v.id }); if (t.pop >= maxPop(v) || !canPay(t.stock, c)) return false;
  payS(t.stock, c); t.pop++; t.mil++; const p = G.P[t.owner]; log(`${t.name} grows to size ${t.pop}`, p.id); checkWin(); return true;
}
function doRecruit(v, h) {
  const t = v.town, c = costOf('recruit', { k: 't', id: v.id }); if (!canPay(t.stock, c) || !v.hexes.includes(h.id) || (h.owner !== -1 && h.owner !== t.owner)) return false;
  payS(t.stock, c); claimHex(h, t.owner); h.armies++; syncLinks(); const p = G.P[t.owner]; log(`${t.name} trains a soldier`, p.id); checkWin(); return true;
}
function doWalls(v) {
  const t = v.town, c = costOf('walls', { k: 't', id: v.id }); if (t.walls || !canPay(t.stock, c)) return false;
  payS(t.stock, c); t.walls = true; t.mil = milMax(v); log(`${t.name} raises stone walls`, t.owner); return true;
}
function doRoad(hd, e) {
  const c = costOf('road', hd, e), s = hStock(hd); if (e.road || !canPay(s, c) || !roadEdges(hd).includes(e)) return false;
  payS(s, c); e.road = true; const p = G.P[hOwner(hd)]; log(`${p.name} ${vb(p, 'build')} a road from ${hName(hd)}`, p.id); syncLinks(); return true;
}
function doFound(h, v) {
  const c = costOf('town', { k: 'c', id: h.id }), st = campStore(h); if (!canPay(st, c) || h.armies <= CFG.settlerCost || !validSpot(v) || !h.vs.includes(v.id)) return false;
  payS(st, c); h.armies -= CFG.settlerCost; h.tired = Math.min(h.tired, h.armies); mkTown(v, h.owner);
  const p = G.P[h.owner]; log(`${p.name} ${vb(p, 'found')} the town of ${v.town.name}`, p.id); syncLinks(); checkWin(); return true;
}
function doTrade(v, give, get) {
  const t = v.town, rate = tradeRate(v); if (give === get || t.stock[give] < rate) return false;
  t.stock[give] -= rate; t.stock[get]++; log(`${t.name} trades ${rate}${ic(give)} for 1${ic(get)}`, t.owner); return true;
}

// ----- harvest
function produce(s) {
  const gain = {}, add = (pid, r, n) => { gain[pid] = gain[pid] || emptyStock(); gain[pid][r] += n }, fx = [];
  G.hexes.forEach(h => {
    if (h.num !== s) return; const r = TERR[h.type].res;
    if (h.owner >= 0 && h.owner !== G.barb) { const y = campYield(h); campStore(h)[r] += y; add(h.owner, r, y); fx.push({ x: h.x, y: h.y + 6, r, n: y, c: G.P[h.owner].color }) }
    else if (h.owner === -1) { // wild land quietly piles up for whoever claims it
      h.acc += CFG.campBaseYield * (h.claimed ? CFG.fallowYieldPct : CFG.wildYieldPct) / 100;
      while (h.acc >= 1 - 1e-9) { h.acc -= 1; if (stotal(h.stock) < CFG.cacheCap) { h.stock[r]++; fx.push({ x: h.x, y: h.y + 6, r, n: 1, c: '#e8e2d0' }) } }
    }
    h.vs.forEach(vid => { const v = V(vid), t = v.town; if (t && (h.owner === -1 || h.owner === t.owner)) { const y = t.pop * CFG.townYieldPerPop; t.stock[r] += y; add(t.owner, r, y); fx.push({ x: v.x, y: v.y - 26, r, n: y, c: G.P[t.owner].color }) } });
  });
  G.fx = { t: Date.now(), items: fx };
  const parts = Object.entries(gain).map(([pid, g]) => `${G.P[pid].name} +${stockText(g)}`);
  log(`Rolled ${s}: ${parts.length ? parts.join(', ') : 'no harvest'}`);
}
function raiders() {
  log('Rolled 7: raiders sweep the island');
  players().forEach(p => {
    let lost = 0;
    stockpiles(p.id).forEach(sp => {
      if (sp.towns.length && sp.towns.every(v => v.town.walls)) return; const s = sp.stock, t = stotal(s);
      if (t > CFG.raidThreshold) { let k = Math.floor(t * CFG.raidLossPct / 100); lost += k; while (k-- > 0) s[randRes(s)]-- }
    });
    if (lost) log(`Raiders carry off ${lost} of ${p.id === 0 ? 'your' : p.name + "'s"} resources`, p.id);
  });
}
function doRoll() {
  const a = d6(), b = d6(); G.dice = [a, b]; G.lastRoll = a + b;
  if (a + b === 7) raiders(); else produce(a + b);
  syncLinks(); G.phase = 'act';
}

// ----- combat
const defN = t => t.k === 'h' ? H(t.id).armies : V(t.id).town.mil;
function canAttackHex(A, B) { const i = A.nb.indexOf(B.id); if (i < 0) return false; const e = E(A.es[i]); return A.armies >= 2 && B.owner !== -1 && B.owner !== A.owner && !e.ridge && !banned(A.owner, 'h', B.id) }
function canSiege(A, v) { return A.armies >= 2 && !!v.town && v.town.owner !== A.owner && A.vs.includes(v.id) && !banned(A.owner, 't', v.id) }
function battleSpec(A, t) {
  const notes = []; let ad = Math.min(CFG.atkDiceMax, A.armies - 1), dd = CFG.defDiceMax, ab = 0, db = 0;
  if (t.k === 'h') {
    const B = H(t.id);
    if (B.type === 'forest' && CFG.forestAtkDicePenalty) { ad -= CFG.forestAtkDicePenalty; notes.push('Forest cover: attacker rolls fewer dice') }
    if (B.type === 'hills' && CFG.hillsDefDice) { dd += CFG.hillsDefDice; notes.push('High ground: defender rolls an extra die') }
    if (B.type === 'fields' && CFG.fieldsAtkBonus) { ab = CFG.fieldsAtkBonus; notes.push(`Open fields: attacker +${ab} on best die`) }
    if (B.type === 'mountain' && CFG.mountainDefBonus) { db = CFG.mountainDefBonus; notes.push(`Mountain camp: defender +${db} on best die`) }
  } else {
    const v = V(t.id);
    if (v.town.walls) { dd += CFG.wallDefDice; notes.push('Walls: defender rolls an extra die') }
    if (touches(v, 'mountain') && CFG.keepBonus) { db = CFG.keepBonus; notes.push(`Stone keep: defender +${db} on best die`) }
  }
  return { ad: Math.max(1, ad), dd: Math.max(1, Math.min(dd, defN(t))), ab, db, notes };
}
function battleRound(A, t) {
  const s = battleSpec(A, t);
  const ad = Array.from({ length: s.ad }, d6).sort((x, y) => y - x), dd = Array.from({ length: s.dd }, d6).sort((x, y) => y - x);
  ad[0] += s.ab; dd[0] += s.db;
  let aL = 0, dL = 0; for (let i = 0; i < Math.min(ad.length, dd.length); i++) { if (ad[i] > dd[i]) dL++; else aL++ }
  A.armies -= aL; A.tired = Math.min(A.tired, A.armies);
  if (t.k === 'h') H(t.id).armies -= dL; else V(t.id).town.mil -= dL;
  return { ad, dd, aL, dL, won: defN(t) <= 0 };
}
async function maybeScorch(loser, t) {
  const p = G.P[loser], s = rawStock(t), tot = stotal(s); if (p.barb || !tot) return;
  const place = t.k === 't' ? V(t.id).town.name : 'your ' + hexName(H(t.id)) + ' camp';
  let yes;
  if (p.ai || G.autoplay) yes = tot >= 3 && Math.random() * 100 < CFG.aiScorchChance; else yes = await askScorch(place, s);
  if (!yes) return;
  const pct = ri(Math.min(CFG.scorchMin, CFG.scorchMax), Math.max(CFG.scorchMin, CFG.scorchMax)); let lost = 0;
  RES.forEach(r => { const k = Math.min(s[r], Math.round(s[r] * pct / 100)); s[r] -= k; lost += k });
  G.bans.push({ pid: loser, k: t.k, id: t.id });
  log(`${p.name} ${vb(p, 'scorch')} the earth: ${lost} of ${tot} resources burn (${pct}%)`, loser);
}
async function captureHex(A, B, mv, carry) {
  const att = G.P[A.owner], loser = B.owner;
  await maybeScorch(loser, { k: 'h', id: B.id });
  const loot = stotal(B.stock), src = campStore(A); carry = carry || defaultCarry(A, B, mv);
  RES.forEach(r => { const k = Math.max(0, Math.min(src[r], carry[r] || 0)); src[r] -= k; B.stock[r] += k });
  B.owner = A.owner; B.claimed = true; B.armies = mv; B.tired = mv; B.fed = A.fed; A.armies -= mv; A.tired = Math.min(A.tired, A.armies);
  log(`${att.name} ${vb(att, 'take')} ${hexName(B)} from ${G.P[loser].name}${loot ? ` and ${vb(att, 'plunder')} ${loot} resources` : ''}`, att.id);
  syncLinks(); checkElim(loser); checkWin();
}
async function captureTown(A, v) {
  const att = G.P[A.owner], t = v.town, loser = t.owner;
  splitTown(v);
  await maybeScorch(loser, { k: 't', id: v.id });
  const loot = stotal(t.stock);
  t.owner = A.owner; t.pop = Math.max(1, t.pop - CFG.captureLosesPop); t.walls = false; t.mil = Math.max(1, Math.ceil(milMax(v) / 2)); t.sent = 0;
  log(`${att.name} ${vb(att, 'capture')} the town of ${t.name} from ${G.P[loser].name}${loot ? ` and ${vb(att, 'seize')} ${loot} resources` : ''}`, att.id);
  syncLinks(); checkElim(loser); checkWin();
}
function checkElim(pid) {
  const p = G.P[pid]; if (p.barb || !p.alive) return;
  if (!myTowns(pid).length && !myHexes(pid).length) { p.alive = false; p.pool = 0; log(`${p.name} ${p.id === 0 ? 'have' : 'has'} been wiped off the island`, pid) }
}
function checkWin() {
  if (G.over || G.phase === 'setup') return false;
  const alive = players().filter(p => p.alive); let w = null;
  if (alive.length === 1) w = alive[0]; else { const p = cur(); if (p.alive && vp(p) >= CFG.vpTarget) w = p }
  if (!w && !G.P[0].alive) { G.over = true; G.winner = null; render(); showEnd(); return true }
  if (w) { G.over = true; G.winner = w; log(`${w.name} ${vb(w, 'win')} the island`, w.id); render(); showEnd(); return true }
  return false;
}

// ----- food: eaten at the end of each of your turns
// A town and the off-farm camps on its supply line eat together from the town's stores.
function foodPlan(pid) {
  const zm = zoneMap(pid), plan = { towns: new Map(), camps: new Map() }, by = new Map(), left = new Map();
  myTowns(pid).forEach(v => by.set(v.id, { v, camps: [], need: 0 }));
  myHexes(pid).forEach(h => {
    if (farmable(h)) { plan.camps.set(h.id, { mode: 'land', need: 0, ok: true }); return }
    const l = zm.get(h.id);
    if (l === undefined) { const need = foodNeed(h.armies, CFG.foodPerSoldier), have = foodIn(h.stock); plan.camps.set(h.id, { mode: 'stock', need, have, ok: have >= need, turns: need ? Math.floor(have / need) : 99 }); return }
    const g = by.get(l); g.camps.push(h); g.need += h.armies * CFG.foodPerSoldier; plan.camps.set(h.id, { mode: 'town', town: l, need: h.armies * CFG.foodPerSoldier });
  });
  by.forEach(g => {
    const v = g.v, farm = townFarm(v), tn = farm ? 0 : v.town.pop * CFG.foodPerTownsperson, total = foodNeed(g.need + tn, 1), st = v.town.stock, have = left.has(st) ? left.get(st) : foodIn(st), ok = have >= total;
    left.set(st, Math.max(0, have - total));
    plan.towns.set(v.id, { mode: farm ? 'land' : 'stock', self: tn, total, have, ok, turns: total ? Math.floor(have / total) : 99, camps: g.camps });
    g.camps.forEach(h => { const c = plan.camps.get(h.id); c.ok = ok; c.total = total });
  });
  return plan;
}
const campFood = h => foodPlan(h.owner).camps.get(h.id);
const townFood = v => foodPlan(v.town.owner).towns.get(v.id);
function hungryList(p) {
  const plan = foodPlan(p.id), out = [];
  plan.towns.forEach((f, vid) => { if (!f.ok) out.push(V(vid).town.name + (f.camps.length ? ' and its camps' : '')) });
  plan.camps.forEach((f, hid) => { if (f.mode === 'stock' && !f.ok) out.push('camp in ' + hexName(H(hid))) });
  return out;
}
const starveChance = fed => fed >= CFG.starveBelow ? 0 : (CFG.starveBelow - fed) / Math.max(1, CFG.starveBelow) * CFG.starveMaxChance / 100;
function hungerStep(o, frac, count) {
  if (frac >= 1) { o.fed = 100; return 0 }
  o.fed = Math.max(0, o.fed - CFG.hungerStep * (1 - frac));
  const ch = starveChance(o.fed); let dead = 0; for (let i = 0; i < count; i++) if (Math.random() < ch) dead++; return dead;
}
function upkeep(p) {
  const who = p.id === 0 ? 'Your' : p.name + "'s", plan = foodPlan(p.id);
  const starveCamp = (h, frac) => {
    const dead = hungerStep(h, frac, h.armies); if (!dead) return;
    h.armies -= dead; h.tired = Math.min(h.tired, Math.max(0, h.armies));
    log(`${who} camp in ${hexName(h)} is starving: ${dead} soldier${dead > 1 ? 's' : ''} lost`, p.id);
    if (h.armies <= 0) { h.armies = 0; h.owner = -1; h.tired = 0 }
  };
  plan.towns.forEach((f, vid) => {
    const v = V(vid), t = v.town, frac = f.total ? eat(t.stock, f.total) / f.total : 1;
    if (f.self > 0) { const dead = Math.min(t.pop - 1, hungerStep(t, frac, t.pop)); if (dead > 0) { t.pop -= dead; t.mil = Math.min(t.mil, milMax(v)); log(`Famine in ${t.name}: ${dead} townspeople starve`, p.id) } } else t.fed = 100;
    f.camps.forEach(h => starveCamp(h, frac));
  });
  plan.camps.forEach((f, hid) => { const h = H(hid); if (f.mode === 'land') h.fed = 100; else if (f.mode === 'stock') starveCamp(h, f.need ? eat(h.stock, f.need) / f.need : 1) });
  checkElim(p.id);
}

// ----- turn engine
function startTurn(p) {
  G.phase = 'roll'; G.sel = null; G.mode = null; G.dice = null; syncLinks();
  log(`${p.name}: round ${G.round}`, p.id);
  myHexes(p.id).forEach(h => {
    h.tired = 0; h.sent = 0;
    if (h.type === 'desert' && h.armies > 1 && CFG.desertAttrition > 0) { const l = Math.min(h.armies - 1, CFG.desertAttrition); h.armies -= l; log(`Desert heat costs ${p.id === 0 ? 'you' : p.name} ${l} soldier${l > 1 ? 's' : ''}`, p.id) }
  });
  const towns = myTowns(p.id); towns.forEach(v => { v.town.mil = milMax(v); v.town.sent = 0 });
  const pop = towns.reduce((s, v) => s + v.town.pop, 0);
  p.pool = towns.length && musterHexes(p.id).length ? CFG.musterBase + Math.floor(pop / Math.max(1, CFG.musterPopPer)) : 0;
}
async function beginTurn() {
  if (G.over) return; const p = cur(); startTurn(p); render();
  if (p.ai || G.autoplay) { G.busy = true; render(); await aiTurn(p); G.busy = false; if (!G.over) finishTurn() }
}
function finishTurn() {
  const p = cur(); if (p.pool > 0) aiMuster(p);
  upkeep(p);
  G.bans = G.bans.filter(b => b.pid !== p.id);
  if (checkWin()) return;
  do { G.turn = (G.turn + 1) % G.n; if (G.turn === G.first) G.round++ } while (!G.P[G.turn].alive);
  beginTurn();
}

// ----- settling draft
function placeStartTown(pid, v) { mkTown(v, pid); RES.forEach(r => v.town.stock[r] = CFG.startStockEach); log(`${G.P[pid].name} ${vb(G.P[pid], 'settle')} ${v.town.name}`, pid) }
function placeStartArmy(pid, h) { claimHex(h, pid); h.armies += CFG.startSoldiers }
async function setupStep() {
  const s = G.setup;
  if (s.i >= s.order.length) { G.phase = 'roll'; G.turn = G.first; G.setup = null; log('The island is settled. Let the conquest begin.'); return beginTurn() }
  const p = G.P[s.order[s.i]]; s.stage = 'town'; s.v = null; G.turn = p.id; render();
  if (p.ai || G.autoplay) {
    G.busy = true; await sleep(500); const v = aiPickSpot(p); placeStartTown(p.id, v); render(); await sleep(350);
    placeStartArmy(p.id, aiPickStartHex(p, v)); s.i++; G.busy = false; render(); return setupStep();
  }
}
