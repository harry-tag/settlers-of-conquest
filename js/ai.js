// ---------- computer players ----------
const best = (arr, f) => arr.reduce((a, b) => f(b) > f(a) ? b : a);
function spotScore(v) { let s = 0; const ty = new Set(); v.hexes.forEach(id => { const h = H(id); if (h.owner === G.barb) return; s += pips(h.num); if (h.num) ty.add(h.type) }); return s + ty.size * 1.5 + (isCoast(v) ? .3 : 0) }
const setupOk = (v, pid) => validSpot(v) && v.hexes.some(id => H(id).owner === -1 || H(id).owner === pid);
function aiPickSpot(p) { const sc = new Map(); G.verts.filter(v => setupOk(v, p.id)).forEach(v => sc.set(v, spotScore(v) + Math.random())); return best([...sc.keys()], v => sc.get(v)) }
function aiPickStartHex(p, v) { return best(recruitHexes(v, p.id), h => pips(h.num) + (h.owner === p.id ? 1 : 0)) }
const enemyNear = (h, pid) => h.nb.filter(n => n >= 0).map(H).filter(n => n.owner !== -1 && n.owner !== pid).reduce((s, n) => s + n.armies, 0);
const deficit = (s, c) => Object.entries(c).reduce((t, [r, n]) => t + Math.max(0, n - s[r]), 0);

function aiMuster(p) {
  while (p.pool > 0) {
    const hs = musterHexes(p.id); if (!hs.length) { p.pool = 0; return }
    const empties = hs.filter(h => h.owner === -1 && h.num), mine = hs.filter(h => h.owner === p.id);
    let t;
    if (empties.length && mine.length < myTowns(p.id).length * 2) t = best(empties, h => pips(h.num) + (farmable(h) ? 3 : 0));
    else if (mine.length) { const sc = new Map(); mine.forEach(h => sc.set(h, enemyNear(h, p.id) * 3 + h.armies * .5 + (farmable(h) ? 4 : 0) + Math.random())); t = best(mine, h => sc.get(h)) }
    else t = hs[0];
    claimHex(t, p.id); t.armies++; p.pool--;
  }
  syncLinks();
}
// food a town should keep back: two turns for itself and the camps eating from it
function townReserve(v, zm) {
  let need = townFarm(v) ? 0 : v.town.pop * CFG.foodPerTownsperson;
  myHexes(v.town.owner).forEach(h => { if (zm.get(h.id) === v.id && !farmable(h)) need += h.armies * CFG.foodPerSoldier });
  return foodNeed(need, 1) * 2;
}
// a camp on this town's supply line with a good corner to settle
function settleCamp(v, zm) {
  let pick = null, bs = 6;
  myHexes(v.town.owner).forEach(h => { if (zm.get(h.id) !== v.id || h.armies <= CFG.settlerCost) return; townSpots(h).forEach(sp => { const sc = spotScore(sp); if (sc >= bs) { bs = sc; pick = [h, sp] } }) });
  return pick;
}
function aiEconomy(p) {
  const zm = zoneMap(p.id);
  // a camp on good ground founds a town when its stores (or its town's) can pay for one
  myHexes(p.id).forEach(h => {
    if (G.over || h.armies <= CFG.settlerCost || myTowns(p.id).length >= 6) return; const st = campStore(h), c = costOf('town', { k: 'c', id: h.id });
    if (!canPay(st, c)) return; const l = zm.get(h.id);
    if (l !== undefined && foodIn(st) - (c.wheat || 0) - (c.sheep || 0) < townReserve(V(l), zm)) return;
    const sp = townSpots(h); if (!sp.length) return; const v = best(sp, spotScore); if (spotScore(v) >= 6) doFound(h, v);
  });
  myTowns(p.id).forEach(v => {
    const t = v.town, hd = { k: 't', id: v.id };
    for (let k = 0; k < 14 && !G.over; k++) {
      const settle = t.pop >= 2 && myTowns(p.id).length < 5 ? settleCamp(v, zoneMap(p.id)) : null, cT = CFG.cost.town;
      const reserve = townReserve(v, zoneMap(p.id)), ok = c => canPay(t.stock, c) && foodIn(t.stock) - (c.wheat || 0) - (c.sheep || 0) >= reserve;
      const threat = v.hexes.map(H).filter(h => h.owner !== -1 && h.owner !== p.id).reduce((s, h) => s + h.armies, 0);
      const rh = recruitHexes(v, p.id), cR = costOf('recruit', hd), cG = costOf('grow', hd), canGrow = t.pop < maxPop(v), rate = tradeRate(v);
      const pickR = () => { const sc = new Map(); rh.forEach(h => sc.set(h, (h.owner === p.id ? 2 + h.armies * .3 : pips(h.num) * .4) + (farmable(h) ? 3 : 0) + enemyNear(h, p.id) + Math.random())); return best(rh, h => sc.get(h)) };
      if (foodIn(t.stock) < reserve) { const sp = ['wood', 'brick', 'ore'].filter(r => t.stock[r] >= rate).sort((a, b) => t.stock[b] - t.stock[a]); if (sp.length) { doTrade(v, sp[0], 'wheat'); continue } }
      if (threat > t.mil && rh.length && canPay(t.stock, cR)) { doRecruit(v, pickR()); continue }
      if (settle && ok(cT)) { doFound(settle[0], settle[1]); continue }
      if (canGrow && ok(cG) && !(settle && deficit(t.stock, cT) <= 3)) { doGrow(v); continue }
      if (!t.walls && ok(costOf('walls', hd)) && (threat > 0 || t.pop >= 3)) { doWalls(v); continue }
      const saving = (canGrow && deficit(t.stock, cG) <= 2) || (settle && deficit(t.stock, cT) <= 4);
      if (rh.length && ok(cR) && !saving) { doRecruit(v, pickR()); continue }
      const rc = costOf('road', hd), re = roadEdges(hd);
      if (re.length && canPay(t.stock, rc) && t.stock.wood >= (rc.wood || 0) + 4 && t.stock.brick >= (rc.brick || 0) + 4) { doRoad(hd, re[rnd(re.length)]); continue }
      const goal = settle ? cT : canGrow ? cG : cR, need = RES.filter(r => (goal[r] || 0) > t.stock[r]);
      const spare = RES.filter(r => t.stock[r] - (goal[r] || 0) >= rate && !((r === 'wheat' || r === 'sheep') && foodIn(t.stock) - rate < reserve)).sort((a, b) => t.stock[b] - t.stock[a]);
      if (need.length && spare.length) { doTrade(v, spare[0], need[0]); continue }
      break;
    }
  });
}
async function aiAttack(p, A, t) {
  G.flash = t; G.sel = { k: 'c', id: A.id }; render(); await sleep(450);
  const prev = G.P[hOwner(t)], where = t.k === 'h' ? hexName(H(t.id)) : V(t.id).town.name; let aL = 0, dL = 0;
  while (A.armies >= 2 && defN(t) > 0) { const r = battleRound(A, t); aL += r.aL; dL += r.dL; if (defN(t) > 0 && (A.armies - 1) < defN(t) * .9) break }
  if (defN(t) <= 0) {
    log(`${p.name} ${vb(p, 'storm')} ${where} (${prev.name}): lost ${aL}, killed ${dL}`, p.id);
    if (t.k === 'h') {
      const B = H(t.id), exposed = A.nb.some(n => n >= 0 && n !== B.id && H(n).owner !== -1 && H(n).owner !== p.id) || A.vs.some(v => V(v).town && V(v).town.owner === p.id);
      await captureHex(A, B, Math.max(1, Math.min(A.armies - 1, exposed ? Math.ceil((A.armies - 1) / 2) : A.armies - 1)));
    } else await captureTown(A, V(t.id));
  } else log(`${p.name} ${vb(p, 'attack')} ${where} (${prev.name}) and ${p.id === 0 ? 'are' : 'is'} repelled: lost ${aL}, killed ${dL}`, p.id);
  G.flash = null; G.sel = null; render(); await sleep(400);
}
async function aiMilitary(p) {
  for (let k = 0; k < 20 && !G.over; k++) {
    let pick = null, bs = 0;
    myHexes(p.id).forEach(A => {
      if (A.armies < 2) return;
      A.nb.forEach(n => {
        if (n < 0) return; const B = H(n); if (!canAttackHex(A, B)) return;
        const sp = battleSpec(A, { k: 'h', id: B.id });
        const def = B.armies * (1 + (sp.dd > CFG.defDiceMax ? .35 : 0) + (sp.db ? .3 : 0) - (sp.ab ? .2 : 0) + (B.type === 'forest' ? .3 : 0));
        const ratio = (A.armies - 1) / def; if (ratio < CFG.aiAttackRatio) return;
        const sc = (2 + stotal(B.stock) * .4 + pips(B.num) / 3 + (B.owner === G.barb ? 0 : 1)) * Math.min(ratio, 3);
        if (sc > bs) { bs = sc; pick = [A, { k: 'h', id: B.id }] }
      });
      A.vs.forEach(vid => {
        const v = V(vid); if (!canSiege(A, v)) return; const t = v.town;
        const def = Math.max(.5, t.mil * (1 + (t.walls ? .4 : 0) + (touches(v, 'mountain') ? .3 : 0)));
        const ratio = (A.armies - 1) / def; if (ratio < CFG.aiAttackRatio) return;
        const sc = (7 + t.pop * 2 + stotal(t.stock) * .3) * Math.min(ratio, 3);
        if (sc > bs) { bs = sc; pick = [A, { k: 't', id: vid }] }
      });
    });
    if (!pick) break; await aiAttack(p, pick[0], pick[1]);
  }
}
function aiMoves(p) {
  const limit = myTowns(p.id).length * 3 + 3;
  [...myHexes(p.id)].forEach(A => {
    if (G.over || A.owner !== p.id) return; let mv = movable(A); if (mv <= 0) return;
    const zm = zoneMap(p.id), R = troopReach(A), fed = h => farmable(h) || zm.has(h.id);
    const engaged = A.nb.some(n => n >= 0 && canAttackHex(A, H(n))) || A.vs.some(v => canSiege(A, V(v)));
    // out of food and off the supply line: fall back to somewhere that can feed the camp
    if (!fed(A) && !engaged && foodIn(A.stock) < foodNeed(A.armies, CFG.foodPerSoldier) && mv >= A.armies) {
      let b = null, bc = 99; R.forEach((c, id) => { const h = H(id); if (fed(h) && c < bc) { bc = c; b = h } });
      if (b) { moveArmy(A, b, A.armies); return }
    }
    if (!farmable(A) && !engaged && A.armies >= 3 && mv >= 2) {
      let b = null, bc = 2.01; R.forEach((c, id) => { const h = H(id); if (farmable(h) && c < bc && !enemyNear(h, p.id)) { bc = c; b = h } });
      if (b) { const n = Math.min(mv, A.armies - 1); moveArmy(A, b, n); mv -= n }
    }
    if (A.armies >= 2 && myHexes(p.id).length < limit) {
      let b = null, bs = 2.5;
      R.forEach((c, id) => {
        const h = H(id); if (h.owner !== -1 || !h.num) return;
        const near = h.vs.some(v => V(v).town && V(v).town.owner === p.id);
        const s = pips(h.num) + (near ? 2 : 0) + stotal(h.stock) * .8 - c * .6 - enemyNear(h, p.id) * .8 - (farmable(h) ? 0 : zm.has(h.id) ? 1.5 : 5); if (s > bs) { bs = s; b = h }
      });
      if (b) { const n = A.armies >= 5 && mv >= 2 ? 2 : 1; moveArmy(A, b, n); mv -= n; if (A.owner !== p.id) return }
    }
    if (mv > 0 && A.armies >= 5 && !engaged) {
      const dA = pathDist(A); let tgt = null, td = 99;
      const consider = h => { const d = dA.get(h.id); if (d !== undefined && d > 0 && d < td) { td = d; tgt = h } };
      G.hexes.forEach(h => { if (h.owner !== -1 && h.owner !== p.id && h.armies < A.armies * .8) consider(h) });
      G.verts.forEach(v => { if (v.town && v.town.owner !== p.id) v.hexes.forEach(id => consider(H(id))) });
      if (tgt) {
        const dT = pathDist(tgt); let b = null, bd = dT.get(A.id); if (bd === undefined) bd = 99;
        R.forEach((c, id) => { const d = dT.get(id); if (d !== undefined && (d < bd || (d === bd && b && fed(H(id)) && !fed(b)))) { bd = d; b = H(id) } });
        if (b) { const n = fed(A) ? Math.min(mv, A.armies - 1) : (mv >= A.armies ? A.armies : 0); if (n > 0) moveArmy(A, b, n) }
      }
    }
  });
  checkWin();
}
// hex steps to everywhere, respecting ridges but ignoring who stands where
function pathDist(from) {
  const d = new Map([[from.id, 0]]), q = [from];
  while (q.length) { const a = q.shift(); a.nb.forEach((n, i) => { if (n < 0 || d.has(n)) return; const e = E(a.es[i]); if (e.ridge && !e.road) return; d.set(n, d.get(a.id) + 1); q.push(H(n)) }) }
  return d;
}
function aiSupply(p) {
  const zm = zoneMap(p.id), camps = myHexes(p.id).filter(h => !zm.has(h.id));
  // remote camps send home what they don't need to eat
  camps.forEach(h => {
    const hd = { k: 'c', id: h.id }; if (h.sent >= CFG.convoysPerHolding || !stotal(h.stock)) return;
    const keep = farmable(h) ? 0 : foodNeed(h.armies, CFG.foodPerSoldier) * 3, amt = { ...h.stock }; let k = keep;
    ['wheat', 'sheep'].forEach(r => { const x = Math.min(amt[r], k); amt[r] -= x; k -= x });
    if (!stotal(amt)) return; const tg = convoyTargets(hd).filter(o => o.k === 't'); if (!tg.length) return;
    sendConvoy(hd, best(tg, o => { const v = V(o.id); return (v.town.pop < maxPop(v) ? 2 : 0) - stotal(v.town.stock) * .05 }), amt);
  });
  myTowns(p.id).forEach(v => {
    const t = v.town, hd = { k: 't', id: v.id }; if (t.sent >= CFG.convoysPerHolding) return;
    const tg = convoyTargets(hd), spare = foodIn(t.stock) - townReserve(v, zm);
    // feed a hungry camp beyond the supply line
    const hungry = tg.filter(o => o.k === 'c' && !farmable(H(o.id)) && foodIn(H(o.id).stock) < foodNeed(H(o.id).armies, CFG.foodPerSoldier) * 2);
    if (hungry.length && spare > 0) {
      const h = H(hungry[0].id), amt = emptyStock(); let k = Math.min(spare, foodNeed(h.armies, CFG.foodPerSoldier) * 3); const tmp = { ...t.stock };
      while (k-- > 0) { const r = tmp.wheat >= tmp.sheep ? 'wheat' : 'sheep'; if (tmp[r] <= 0) break; tmp[r]--; amt[r]++ }
      if (stotal(amt)) { sendConvoy(hd, hungry[0], amt); return }
    }
    if (t.pop >= maxPop(v) && t.walls && stotal(t.stock) > 10) {
      const tt = tg.filter(o => o.k === 't' && V(o.id).town.pop < maxPop(V(o.id))); if (!tt.length) return;
      const amt = { ...t.stock }; let k = townReserve(v, zm);['wheat', 'sheep'].forEach(r => { const x = Math.min(amt[r], k); amt[r] -= x; k -= x });
      if (stotal(amt)) sendConvoy(hd, tt[0], amt);
    }
  });
}
async function aiTurn(p) {
  await sleep(450); doRoll(); render(); await sleep(650);
  aiMuster(p); aiEconomy(p); render(); if (G.over) return; await sleep(400);
  await aiMilitary(p); if (G.over) return;
  aiMoves(p); render(); if (G.over) return; await sleep(350);
  await aiMilitary(p); if (G.over) return;
  aiEconomy(p); if (G.over) return;
  G.phase = 'supply'; aiSupply(p); render(); await sleep(350);
}
