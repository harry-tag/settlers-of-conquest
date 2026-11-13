// ---------- interface ----------
const $ = id => document.getElementById(id);
const humanCan = () => G && !G.over && !G.busy && !cur().ai && !G.autoplay;
const TERR_TIP = {
  forest: () => `Entering costs ${CFG.forestMoveCost} movement. Attackers roll ${CFG.forestAtkDicePenalty} fewer dice.`,
  hills: () => `High ground: defenders roll ${CFG.hillsDefDice} extra dice.`,
  fields: () => `Farmland: soldiers here feed themselves. Open ground: attackers get +${CFG.fieldsAtkBonus} on their best die.`,
  mountain: () => `Ridges block movement and roads. Defenders get +${CFG.mountainDefBonus} on their best die.`,
  pasture: () => `Farmland: soldiers here feed themselves. Armies starting here march +${CFG.pastureMoveBonus}; convoys reach +${CFG.pastureConvoyBonus}.`,
  desert: () => `No harvest. Armies lose ${CFG.desertAttrition} soldier each turn (never the last).`
};

function HL() {
  const o = { move: new Map(), atk: new Set(), siege: new Set(), verts: new Set(), edges: new Set(), gold: new Set(), conv: [] };
  if (!humanCan()) return o; const p = cur();
  if (G.phase === 'setup') {
    const s = G.setup; if (s.stage === 'town') G.verts.forEach(v => { if (setupOk(v, p.id)) o.verts.add(v.id) }); else recruitHexes(V(s.v), p.id).forEach(h => o.gold.add(h.id));
    return o;
  }
  const sel = G.sel, mine = sel && hOwner(sel) === p.id;
  if (G.phase === 'act') {
    if (G.mode === 'road' && mine) { roadEdges(sel).forEach(e => o.edges.add(e.id)); return o }
    if (G.mode === 'found' && mine) { townSpots(H(sel.id)).forEach(v => o.verts.add(v.id)); return o }
    if (G.mode === 'recruit' && mine) { recruitHexes(V(sel.id), p.id).forEach(h => o.gold.add(h.id)); return o }
    if (p.pool > 0) { musterHexes(p.id).forEach(h => o.gold.add(h.id)); return o }
    if (mine && sel.k === 'c') {
      const A = H(sel.id); if (movable(A) > 0) o.move = troopReach(A);
      A.nb.forEach(n => { if (n >= 0 && canAttackHex(A, H(n))) o.atk.add(n) }); A.vs.forEach(v => { if (canSiege(A, V(v))) o.siege.add(v) });
    }
  }
  if (G.phase === 'supply' && mine && (sel.k === 't' || linkOf(H(sel.id)) === null) && hObj(sel).sent < CFG.convoysPerHolding && stotal(rawStock(sel))) o.conv = convoyTargets(sel);
  return o;
}

// ----- clicks
function onHex(id, ev) {
  if (!humanCan()) return; const p = cur(), h = H(id), hl = G.hl;
  if (G.phase === 'setup') { if (G.setup.stage === 'army' && hl.gold.has(id)) { placeStartArmy(p.id, h); G.setup.i++; setupStep() } return }
  if (G.mode === 'recruit') { if (hl.gold.has(id)) { doRecruit(V(G.sel.id), h) } G.mode = null; return render() }
  if (G.mode) { G.mode = null; return render() }
  if (G.phase === 'act' && p.pool > 0) { if (hl.gold.has(id)) { const n = ev && ev.shiftKey ? p.pool : 1; claimHex(h, p.id); h.armies += n; p.pool -= n; syncLinks(); checkWin() } else flash('Place your mustered soldiers on a glowing hex next to one of your towns.'); return render() }
  const s = G.sel && G.sel.k === 'c' && H(G.sel.id).owner === p.id ? H(G.sel.id) : null;
  if (G.phase === 'act' && s && s.id !== id) {
    if (hl.atk.has(id)) return attackModal(s, { k: 'h', id });
    if (hl.move.has(id)) return moveModal(s, h);
  }
  if (G.phase === 'supply' && hl.conv.some(c => c.k === 'c' && c.id === id)) return convoyModal(G.sel, { k: 'c', id });
  G.sel = h.owner !== -1 && !(s && s.id === id) ? { k: 'c', id } : null; render();
}
function onTown(vid) {
  if (!humanCan() || G.phase === 'setup') return; const hl = G.hl;
  if (G.mode) G.mode = null;
  if (G.phase === 'act' && hl.siege.has(vid)) return attackModal(H(G.sel.id), { k: 't', id: vid });
  if (G.phase === 'supply' && hl.conv.some(c => c.k === 't' && c.id === vid)) return convoyModal(G.sel, { k: 't', id: vid });
  G.sel = sameH(G.sel, { k: 't', id: vid }) ? null : { k: 't', id: vid }; render();
}
function onVertex(vid) {
  if (!humanCan() || !G.hl.verts.has(vid)) return; const p = cur(), v = V(vid);
  if (G.phase === 'setup') {
    placeStartTown(p.id, v); const hs = recruitHexes(v, p.id);
    if (hs.length === 1) { placeStartArmy(p.id, hs[0]); G.setup.i++; return setupStep() }
    G.setup.stage = 'army'; G.setup.v = vid; return render();
  }
  if (G.mode === 'found') { doFound(H(G.sel.id), v); G.mode = null; render() }
}
function onEdge(eid) { if (!humanCan() || G.mode !== 'road' || !G.hl.edges.has(eid)) return; doRoad(G.sel, E(eid)); G.mode = null; render() }

// ----- buttons
function actRoll() { if (!humanCan() || G.phase !== 'roll') return; doRoll(); render() }
function actSupply() { if (!humanCan() || G.phase !== 'act') return; const p = cur(); if (p.pool > 0) aiMuster(p); G.phase = 'supply'; G.mode = null; if (checkWin()) return; render() }
function actEnd() { if (!humanCan() || G.phase !== 'supply') return; finishTurn() }
function actAuto() { const p = cur(); if (humanCan() && p.pool > 0) { aiMuster(p); checkWin(); render() } }
function actBuild(kind) {
  if (!humanCan() || G.phase !== 'act' || !G.sel || hOwner(G.sel) !== cur().id) return; const sel = G.sel;
  if (kind === 'grow') doGrow(V(sel.id)); else if (kind === 'walls') doWalls(V(sel.id));
  else if (kind === 'recruit') { const hs = recruitHexes(V(sel.id), cur().id); if (hs.length === 1) doRecruit(V(sel.id), hs[0]); else G.mode = G.mode === 'recruit' ? null : 'recruit' }
  else G.mode = G.mode === kind ? null : kind;
  render();
}
function actTrade() { if (!humanCan() || G.phase !== 'act' || !G.sel || G.sel.k !== 't') return; G.tGive = $('tGive').value; G.tGet = $('tGet').value; doTrade(V(G.sel.id), G.tGive, G.tGet); render() }
let flashT = null;
function flash(t) { G.note = t; clearTimeout(flashT); flashT = setTimeout(() => { if (G) { G.note = null; renderHint() } }, 3500) }

// ----- modals
function openModal(html) { $('modal').innerHTML = html; $('modalBg').hidden = false }
function closeModal() { $('modalBg').hidden = true }
const diceHtml = (arr, cls) => arr.map(v => `<span class="die ${cls}">${v}</span>`).join('');
function carryHtml(A, B, n) {
  const zm = zoneMap(A.owner), src = campStore(A), la = zm.get(A.id), lb = zm.get(B.id);
  if (lb !== undefined) return `<p class="muted">${hexName(B)} is on the supply line of ${V(lb).town.name}, so soldiers there draw on its stores.</p>`;
  const need = foodNeed(n, CFG.foodPerSoldier);
  let h = `<p class="warn">${hexName(B)} is beyond your supply lines. ${farmable(B) ? 'Soldiers can live off the land there.' : `There is no farmland there: ${n} soldiers eat ${need} wheat or wool a turn, or go hungry.`}</p>`;
  if (!stotal(src)) return h + `<p class="muted">There is nothing here to pack.</p>`;
  const def = defaultCarry(A, B, n);
  return h + `<p>Pack supplies from ${la !== undefined ? V(la).town.name : 'this camp'}:</p>` + RES.filter(r => src[r]).map(r => `<div class="cv">${ic(r)}<input type="range" id="cr_${r}" min="0" max="${src[r]}" value="${def[r]}" oninput="crv_${r}.textContent=this.value"><b id="crv_${r}">${def[r]}</b></div>`).join('');
}
function syncCarry(a, b, n) { const def = defaultCarry(H(a), H(b), n); RES.forEach(r => { const e = $('cr_' + r), l = $('crv_' + r); if (e) { e.value = def[r]; if (l) l.textContent = e.value } }) }
function readCarry() { const c = emptyStock(); RES.forEach(r => { const e = $('cr_' + r); if (e) c[r] = +e.value }); return c }
let ATK = null;
function attackModal(A, t) { ATK = { A, t, prev: G.P[hOwner(t)], aL: 0, dL: 0, last: null, msg: '', busy: false }; drawAttack() }
function drawAttack() {
  const { A, t, last, prev } = ATK, p = cur(), where = t.k === 'h' ? hexName(H(t.id)) : V(t.id).town.name;
  if (defN(t) <= 0) {
    if (t.k === 't') return finishAttack(0);
    const mx = A.armies - 1;
    return openModal(`<h2>${where} is yours</h2><p>March soldiers in from ${hexName(A)}. At least one stays behind.</p>
      <input type="range" id="mv" min="1" max="${mx}" value="${mx}" oninput="mvv.textContent=this.value;syncCarry(${A.id},${t.id},+this.value)"><div class="msg">Move <b id="mvv">${mx}</b> of ${A.armies}</div>
      ${carryHtml(A, H(t.id), mx)}
      <div class="row"><button class="primary" onclick="finishAttack(+mv.value)">March in</button></div>`);
  }
  const sp = battleSpec(A, t), can = A.armies >= 2;
  openModal(`<h2>${t.k === 't' ? 'Siege of' : 'Attack on'} ${where}</h2>
    <div class="vs"><div class="side"><div class="who" style="color:${p.color}">${p.name}</div><div class="big">${A.armies}</div><small>${can ? `rolling ${sp.ad}` : 'cannot attack'}</small><div class="bdice">${last ? diceHtml(last.ad, 'red') : ''}</div></div>
    <div class="mid">vs</div>
    <div class="side"><div class="who" style="color:${prev.barb ? '#c9b8a0' : prev.color}">${prev.name}</div><div class="big">${defN(t)}</div><small>${t.k === 't' ? 'militia, ' : ''}rolling ${sp.dd}</small><div class="bdice">${last ? diceHtml(last.dd, 'blue') : ''}</div></div></div>
    ${sp.notes.length ? `<ul class="notes">${sp.notes.map(n => `<li>${n}</li>`).join('')}</ul>` : ''}
    <div class="msg">${ATK.msg}</div>
    <div class="row"><button class="primary" ${can ? '' : 'disabled'} onclick="atkRoll(false)">Roll once</button><button ${can ? '' : 'disabled'} onclick="atkRoll(true)">Fight to the end</button><button onclick="atkEnd()">Withdraw</button></div>`);
}
function atkRoll(blitz) {
  const { A, t } = ATK; if (A.armies < 2 || defN(t) <= 0) return; let r;
  do { r = battleRound(A, t); ATK.aL += r.aL; ATK.dL += r.dL } while (blitz && A.armies >= 2 && defN(t) > 0);
  ATK.last = r; ATK.msg = r.won ? '' : `You lose ${r.aL}, they lose ${r.dL}.` + (A.armies < 2 ? ' You have no one left to send.' : '');
  render(); drawAttack();
}
function atkEnd() {
  const { t, prev } = ATK;
  if (ATK.aL + ATK.dL > 0) log(`You attack ${t.k === 'h' ? hexName(H(t.id)) : V(t.id).town.name} (${prev.name}) and withdraw: lost ${ATK.aL}, killed ${ATK.dL}`, 0);
  ATK = null; closeModal(); render();
}
async function finishAttack(mv) {
  if (!ATK || ATK.busy) return; ATK.busy = true; const { A, t, prev } = ATK, carry = readCarry();
  log(`You storm ${t.k === 'h' ? hexName(H(t.id)) : V(t.id).town.name} (${prev.name}): lost ${ATK.aL}, killed ${ATK.dL}`, 0);
  closeModal();
  if (t.k === 'h') { await captureHex(A, H(t.id), Math.max(1, Math.min(mv, A.armies - 1)), carry); G.sel = { k: 'c', id: t.id } } else { await captureTown(A, V(t.id)); G.sel = { k: 't', id: t.id } }
  ATK = null; if (!G.over) render();
}
function moveModal(A, B) {
  const mx = movable(A);
  openModal(`<h2>March to ${hexName(B)}</h2><p>${mx} of ${A.armies} soldiers here can still march this turn.${B.owner === -1 && stotal(B.stock) ? ` They will gather the ${stotal(B.stock)} resources lying there.` : ''}</p>
    <input type="range" id="mv" min="1" max="${mx}" value="${mx}" oninput="mvv.textContent=this.value;syncCarry(${A.id},${B.id},+this.value)"><div class="msg">Move <b id="mvv">${mx}</b></div>
    ${carryHtml(A, B, mx)}
    <div class="row"><button class="primary" onclick="doMove(${A.id},${B.id},+mv.value)">March</button><button onclick="closeModal()">Cancel</button></div>`);
}
function doMove(a, b, n) { moveArmy(H(a), H(b), Math.max(1, Math.min(n, movable(H(a)))), readCarry()); G.sel = { k: 'c', id: b }; closeModal(); if (!checkWin()) render() }
function convoyModal(from, to) {
  const s = rawStock(from);
  openModal(`<h2>Supply convoy</h2><p>From ${hName(from)} to ${hName(to)}. Each holding can send ${CFG.convoysPerHolding} convoy${CFG.convoysPerHolding > 1 ? 's' : ''} per turn.</p>
    ${RES.filter(r => s[r]).map(r => `<div class="cv">${ic(r)}<input type="range" id="cv_${r}" min="0" max="${s[r]}" value="${s[r]}" oninput="cvv_${r}.textContent=this.value"><b id="cvv_${r}">${s[r]}</b></div>`).join('')}
    <div class="row"><button class="primary" onclick="doConvoy('${from.k}',${from.id},'${to.k}',${to.id})">Send convoy</button><button onclick="closeModal()">Cancel</button></div>`);
}
function doConvoy(fk, fi, tk, ti) { const amt = {}; RES.forEach(r => { const el = $('cv_' + r); amt[r] = el ? +el.value : 0 }); sendConvoy({ k: fk, id: fi }, { k: tk, id: ti }, amt); closeModal(); render() }
let scorchResolve = null;
function askScorch(place, s) {
  return new Promise(res => {
    scorchResolve = res;
    openModal(`<h2>${place} is falling</h2><p>The enemy is about to seize <b>${stockText(s)}</b> held there.</p>
      <p>Scorch the earth to burn ${Math.min(CFG.scorchMin, CFG.scorchMax)}–${Math.max(CFG.scorchMin, CFG.scorchMax)}% of it. The price: you cannot attack this place on your next turn.</p>
      <div class="row"><button class="danger" onclick="answerScorch(true)">Scorch the earth</button><button onclick="answerScorch(false)">Leave it intact</button></div>`);
  });
}
function answerScorch(y) { closeModal(); const r = scorchResolve; scorchResolve = null; if (r) r(y) }
function showEnd() {
  const w = G.winner, win = w && w.id === 0;
  openModal(`<h2>${win ? 'The island is yours' : 'Defeat'}</h2><p>${w ? (win ? `You win with ${vp(w)} victory points in round ${G.round}.` : `${w.name} wins with ${vp(w)} victory points.`) : 'Your last town and soldier are gone.'}</p>
    <div class="row"><button class="primary" onclick="location.reload()">Play again</button><button onclick="closeModal()">Look at the board</button></div>`);
}
function askNew() { openModal(`<h2>Start over?</h2><p>This abandons the current game.</p><div class="row"><button class="primary" onclick="location.reload()">New game</button><button onclick="closeModal()">Keep playing</button></div>`) }

// ----- panel
const stockHtml = s => `<div class="stock">${RES.map(r => `<span class="${s[r] ? '' : 'zero'}">${ic(r)}<b>${s[r]}</b></span>`).join('')}</div>`;
function actBtn(kind, label, cost, ok, why) { return `<button class="act ${G.mode === kind ? 'on' : ''}" ${ok ? '' : 'disabled'} title="${why || ''}" onclick="actBuild('${kind}')"><span>${label}</span><span class="cost">${costText(cost)}</span></button>` }
function foodLine(f, o, unit) {
  const n1 = x => Math.round(x * 10) / 10, left = f.turns >= 1 ? f.turns + ' turn' + (f.turns > 1 ? 's' : '') + ' of food left' : 'not enough for a full meal';
  let t;
  if (unit === 'soldier') t = f.mode === 'land' ? 'Fed by the farmland it stands on' : f.mode === 'town' ? `Eats ${n1(f.need)} a turn from ${V(f.town).town.name}` + (f.ok ? '' : ', which is short of food') : f.have ? `Eats ${f.need} a turn from its own stores: ${left}` : `Needs ${f.need} wheat or wool a turn and has none`;
  else { const camps = f.camps.length ? ` its ${f.camps.length} off-farm camp${f.camps.length > 1 ? 's' : ''}` : ''; t = !f.total ? 'Fed by nearby farmland' : (f.mode === 'land' ? `Fed by nearby farmland, but${camps} eat ${f.total} a turn` : `The town${camps ? ' and' + camps : ''} eat${camps ? '' : 's'} ${f.total} a turn`) + `: ${left}` }
  let h = `<div class="food ${f.ok ? '' : 'bad'}">${ic('wheat')}<span>${t}</span></div>`;
  if (o.fed < 99.5) { const ch = Math.round(starveChance(o.fed) * 100); h += `<div class="hbar" title="Hunger"><i style="width:${Math.max(3, o.fed)}%;background:${o.fed < CFG.starveBelow ? 'var(--danger)' : o.fed < 70 ? 'var(--brass)' : 'var(--ok)'}"></i></div><p class="${ch ? 'warn' : 'muted'}">Fed ${Math.round(o.fed)}%.${ch ? ` Each ${unit} has a ${ch}% chance of starving at the end of the turn.` : ` Starvation begins below ${CFG.starveBelow}%.`}</p>` }
  return h;
}
function selHtml() {
  const sel = G.sel; if (!sel || hOwner(sel) < 0) return `<p class="muted">Select a town or a camp to see what it holds and what it can do.</p>`;
  const P = G.P[hOwner(sel)], mine = !P.barb && P.id === cur().id && humanCan(), act = mine && G.phase === 'act', s = hStock(sel), seeStock = P.id === 0 || TEST;
  let h = '';
  if (sel.k === 't') {
    const v = V(sel.id), t = v.town, tr = traits(v);
    h += `<div class="selhead"><span class="dot" style="background:${P.color}"></span><h3>${t.name}</h3><span class="muted">${P.name}</span></div>
      <div class="facts"><span>Size <b>${t.pop}</b>/${maxPop(v)}</span><span>Militia <b>${t.mil}</b></span><span>${t.walls ? 'Walled' : 'No walls'}</span><span>Yield <b>${t.pop * CFG.townYieldPerPop}</b> per hex</span></div>
      ${tr.length ? `<div class="traits">${tr.map(x => `<span title="${x[1]}"><b>${x[0]}</b> ${x[1]}</span>`).join('')}</div>` : ''}`;
    if (seeStock) h += foodLine(townFood(v), t, 'townsperson');
    const sh = sharers(v); if (sh.length) h += `<p class="link">Joined by road to <b>${sh.map(o => o.town.name).join(', ')}</b>: one shared store.</p>`;
    h += seeStock ? stockHtml(s) : `<p class="muted">Holds ${stotal(s)} resources.</p>`;
    if (act) {
      const cG = costOf('grow', sel), cR = costOf('recruit', sel), cW = costOf('walls', sel), cRd = costOf('road', sel), rate = tradeRate(v);
      h += actBtn('grow', 'Grow the town', cG, t.pop < maxPop(v) && canPay(s, cG), t.pop >= maxPop(v) ? 'Already at full size' : '')
        + actBtn('recruit', 'Train a soldier', cR, canPay(s, cR) && recruitHexes(v, P.id).length > 0)
        + actBtn('walls', 'Raise walls', cW, !t.walls && canPay(s, cW), t.walls ? 'Already walled' : '')
        + actBtn('road', 'Build a road', cRd, canPay(s, cRd) && roadEdges(sel).length > 0, roadEdges(sel).length ? '' : 'No free border here; ridges cannot carry roads');
      const opt = sv => RES.map(r => `<option value="${r}" ${r === sv ? 'selected' : ''}>${RINFO[r]}</option>`).join('');
      h += `<div class="trade"><span>Market ${rate}:1</span><select id="tGive" aria-label="Give">${opt(G.tGive || 'wood')}</select><span>for</span><select id="tGet" aria-label="Get">${opt(G.tGet || 'ore')}</select><button onclick="actTrade()">Trade</button></div>`;
    }
  } else {
    const hx = H(sel.id), l = P.barb ? null : linkOf(hx);
    h += `<div class="selhead"><span class="dot" style="background:${P.color}"></span><h3>Camp in ${hexName(hx)}</h3><span class="muted">${P.name}</span></div>
      <div class="facts"><span>Soldiers <b>${hx.armies}</b></span>${mine ? `<span>Can march <b>${movable(hx)}</b></span>` : ''}${hx.num && !P.barb ? `<span>Yield <b>${campYield(hx)}</b> on a ${hx.num}</span>` : ''}${roaded(hx) ? '<span>On a road</span>' : ''}</div>
      <div class="traits"><span><b>${TERR[hx.type].name}</b> ${TERR_TIP[hx.type]()}</span></div>`;
    if (!P.barb && seeStock) h += foodLine(campFood(hx), hx, 'soldier');
    if (l !== null) h += `<p class="link">On the supply line of <b>${V(l).town.name}</b>: its harvest goes straight there and it spends from the town's stores.</p>`;
    else if (!P.barb) h += `<p class="muted">Beyond your supply lines: this camp keeps and spends its own stock.</p>`;
    h += seeStock ? stockHtml(s) : `<p class="muted">Holds ${stotal(hx.stock)} resources to plunder.</p>`;
    if (act) {
      const cT = costOf('town', sel), cRd = costOf('road', sel);
      h += actBtn('found', `Found a town (uses ${CFG.settlerCost} soldier${CFG.settlerCost === 1 ? '' : 's'})`, cT, canPay(s, cT) && hx.armies > CFG.settlerCost && townSpots(hx).length > 0, townSpots(hx).length ? '' : 'No free corner: too close to another town, or pinched between ridges')
        + actBtn('road', 'Build a road', cRd, canPay(s, cRd) && roadEdges(sel).length > 0, roadEdges(sel).length ? '' : 'No free border here; ridges cannot carry roads');
    }
  }
  if (mine && G.phase === 'supply') { const store = sel.k === 't' || linkOf(H(sel.id)) === null; h += `<p class="muted">${!store ? 'This camp is on a supply line and needs no convoys.' : hObj(sel).sent >= CFG.convoysPerHolding ? 'This holding has already sent its convoy.' : !stotal(rawStock(sel)) ? 'Nothing here to send.' : G.hl.conv.length ? 'Click a green holding to send it supplies.' : 'No other holding of yours is within convoy range.'}</p>` }
  if (TEST && hOwner(sel) >= 0) h += `<div class="row test"><button onclick="cheat('res')">+5 of each</button>${sel.k === 'c' ? `<button onclick="cheat('army')">+3 soldiers</button>` : `<button onclick="cheat('pop')">+1 size</button>`}</div>`;
  return h;
}
function ledgerHtml() {
  const zm = zoneMap(0), tot = emptyStock(), plan = foodPlan(0); let rows = '';
  stockpiles(0).forEach(sp => {
    const st = sp.stock, isT = sp.towns.length > 0; RES.forEach(r => tot[r] += st[r]);
    const ids = new Set(sp.towns.map(v => v.id)), linked = isT ? myHexes(0).filter(h => ids.has(zm.get(h.id))).length : 0;
    const ok = isT ? sp.towns.every(v => plan.towns.get(v.id).ok) : plan.camps.get(sp.hd.id).ok;
    const on = G.sel && (isT ? G.sel.k === 't' && ids.has(G.sel.id) : sameH(G.sel, sp.hd));
    rows += `<tr class="${on ? 'on' : ''}" onclick="selectH('${sp.hd.k}',${sp.hd.id})"><td><b>${isT ? sp.towns.map(v => v.town.name).join(' + ') : 'Camp, ' + hexName(H(sp.hd.id))}</b>${sp.towns.length > 1 ? '<small>joined by road, one shared store</small>' : ''}${linked ? `<small>supplies ${linked} camp${linked > 1 ? 's' : ''}</small>` : ''}${ok ? '' : '<small class="warn">short of food</small>'}</td>${RES.map(r => `<td class="${st[r] ? '' : 'zero'}">${st[r]}</td>`).join('')}</tr>`;
  });
  return `<table class="ledger"><tr><th></th>${RES.map(r => `<th>${ic(r)}</th>`).join('')}</tr>${rows}<tr class="tot"><td>All stores</td>${RES.map(r => `<td>${tot[r]}</td>`).join('')}</tr></table><p class="muted">Dotted hexes are on a supply line. Camps there share their town's stores.</p>`;
}
function selectH(k, id) { if (G.busy && !G.over) { } G.sel = { k, id }; G.mode = null; render() }
function toggleStores() { G.stores = !G.stores; render() }
function cheat(k) { const s = G.sel; if (!s) return; if (k === 'res') RES.forEach(r => hStock(s)[r] += 5); if (k === 'army') H(s.id).armies += 3; if (k === 'pop') { V(s.id).town.pop++; V(s.id).town.mil++ } render() }
function hintText() {
  if (G.note) return G.note; if (G.over) return ''; const p = cur();
  if (!humanCan()) return G.phase === 'setup' ? `${p.name} is choosing where to settle.` : `${p.name} is taking a turn.`;
  if (G.phase === 'setup') return G.setup.stage === 'town' ? 'Pick a glowing corner for your town. It harvests the hexes it touches.' : `Now station ${CFG.startSoldiers} soldiers on a neighbouring hex.`;
  if (G.phase === 'roll') return 'Roll the dice to harvest.';
  if (G.phase === 'act') {
    if (G.mode === 'road') return 'Click a glowing hex border to lay the road. Click anywhere else to cancel.';
    if (G.mode === 'found') return 'Click a glowing corner to found the town.';
    if (G.mode === 'recruit') return 'Click a glowing hex to station the new soldier.';
    if (p.pool > 0) return `Place ${p.pool} mustered soldier${p.pool > 1 ? 's' : ''} next to your towns. Shift-click places them all.`;
    if (G.sel && G.sel.k === 'c' && hOwner(G.sel) === p.id) return 'Blue: march there. Red: attack. Click a red town to lay siege.';
    return 'Select a town to build, or a camp to march and attack.';
  }
  return 'Supply phase: select a town or a remote camp, then a green holding to send it a convoy. Everyone eats when the turn ends.';
}
function renderHint() { $('hint').textContent = hintText() }
function render() {
  if (!G) return; G.hl = HL(); const p = cur(), hum = humanCan();
  $('players').innerHTML = players().map(q => `<div class="pchip ${q.id === G.turn && !G.over ? 'turn' : ''} ${q.alive ? '' : 'dead'}" style="--pc:${q.color}">
    <div class="nm"><span>${q.name}</span><b>${G.phase === 'setup' ? 0 : vp(q)}<small>/${CFG.vpTarget}</small></b></div>
    <div class="st">${myTowns(q.id).length} towns · ${myHexes(q.id).length} hexes · ${myHexes(q.id).reduce((s, h) => s + h.armies, 0)} soldiers · ${totalGoods(q.id)} goods</div></div>`).join('');
  drawBoard();
  const ph = G.phase, steps = [['roll', 'Roll'], ['act', 'Act'], ['supply', 'Supply']];
  $('phases').innerHTML = ph === 'setup' ? `<span class="on">Settling: town ${Math.min(G.setup.i + 1, G.setup.order.length)} of ${G.setup.order.length}</span>` : steps.map(s => `<span class="${s[0] === ph ? 'on' : ''}">${s[1]}</span>`).join('');
  $('status').innerHTML = G.over ? 'Game over' : hum ? (ph === 'setup' ? 'Your pick' : 'Your turn') : `<span style="color:${p.color}">${p.name}</span>`;
  $('round').textContent = ph === 'setup' ? '' : 'Round ' + G.round;
  $('dice').innerHTML = G.dice ? `<span class="die">${G.dice[0]}</span><span class="die">${G.dice[1]}</span><span class="sum">${G.dice[0] + G.dice[1] === 7 ? 'Raiders' : 'Harvest ' + (G.dice[0] + G.dice[1])}</span>` : '';
  $('btns').innerHTML = !hum || ph === 'setup' ? '' : ph === 'roll' ? `<button class="primary" onclick="actRoll()">Roll dice</button>` : ph === 'act' ? `<button class="primary" onclick="actSupply()">Go to supply phase</button>` : `<button class="primary" onclick="actEnd()">End turn</button>`;
  $('pool').innerHTML = hum && ph === 'act' && p.pool > 0 ? `<div class="poolbox"><b>${p.pool}</b> mustered soldier${p.pool > 1 ? 's' : ''} to place <button onclick="actAuto()">Place for me</button></div>` : '';
  const hungry = hum && (ph === 'act' || ph === 'supply') ? hungryList(p) : [];
  $('hungry').innerHTML = hungry.length ? `<div class="warnbox"><b>Going hungry when the turn ends:</b> ${hungry.join(', ')}.</div>` : '';
  $('sel').innerHTML = selHtml();
  $('ledgerCard').hidden = !G.stores; if (G.stores) $('ledger').innerHTML = ledgerHtml();
  $('storesBtn').textContent = G.stores ? 'Hide my stores' : 'Show my stores'; $('storesBtn').hidden = ph === 'setup'; $('storesBtn').classList.toggle('on', !!G.stores);
  $('log').innerHTML = G.log.slice(0, 90).map(l => `<div style="${l.pid != null && l.pid >= 0 ? '--pc:' + G.P[l.pid].color : ''}" class="${l.pid != null ? 'pl' : ''}">${l.msg}</div>`).join('');
  $('testCard').hidden = !TEST; if (TEST) $('autoBtn').textContent = G.autoplay ? 'Stop autoplay' : 'Computer plays my turns';
  renderHint();
}

// ----- test mode: every number is live-editable
function drawSettings() {
  let h = `<div class="sethead"><h2>Test settings</h2><button onclick="toggleSettings()">Close</button></div><p class="muted">Changes apply immediately and are remembered on this device.</p>`;
  h += `<h3>Costs</h3><table><tr><th></th>${RES.map(r => `<th>${ic(r)}</th>`).join('')}</tr>${Object.keys(CFG.cost).map(b => `<tr><td>${COST_NAMES[b]}</td>${RES.map(r => `<td><input type="number" min="0" id="c_${b}_${r}" value="${CFG.cost[b][r] || 0}" onchange="setCost('${b}','${r}',this.value)"></td>`).join('')}</tr>`).join('')}</table>`;
  META.forEach(([g, items]) => { h += `<h3>${g}</h3>` + items.map(([k, label]) => `<label for="s_${k}"><span>${label}</span><input type="number" step="any" id="s_${k}" value="${CFG[k]}" onchange="setCfg('${k}',this.value)"></label>`).join('') });
  h += `<div class="row"><button class="danger" onclick="resetCfg()">Reset everything to defaults</button></div>`;
  $('settings').innerHTML = h;
}
function setCfg(k, v) { const n = parseFloat(v); if (isNaN(n)) return; CFG[k] = n; saveCfg(); if (G) { G.verts.forEach(x => { if (x.town) x.town.mil = Math.min(x.town.mil, milMax(x)) }); render() } }
function setCost(b, r, v) { const n = Math.max(0, parseInt(v) || 0); if (n) CFG.cost[b][r] = n; else delete CFG.cost[b][r]; saveCfg(); if (G) render() }
function resetCfg() { CFG = clone(DEFAULTS); saveCfg(); drawSettings(); if (G) render() }
function toggleSettings() { const s = $('settings'); s.hidden = !s.hidden; if (!s.hidden) drawSettings() }
function toggleAuto() { G.autoplay = !G.autoplay; closeModal(); if (G.autoplay && !G.busy && !G.over) { if (G.phase === 'setup') { if (G.setup.stage === 'army') { placeStartArmy(cur().id, aiPickStartHex(cur(), V(G.setup.v))); G.setup.i++ } setupStep() } else resumeAuto() } else render() }
async function resumeAuto() {
  const p = cur(); G.busy = true; G.mode = null; G.sel = null;
  if (G.phase === 'roll') { doRoll(); render(); await sleep(400) }
  if (G.phase === 'act') { aiMuster(p); aiEconomy(p); await aiMilitary(p); if (!G.over) aiMoves(p); if (!G.over) await aiMilitary(p); if (G.over) { G.busy = false; return } G.phase = 'supply' }
  aiSupply(p); render(); await sleep(300); G.busy = false; if (!G.over) finishTurn();
}

// ----- start
document.querySelectorAll('.seg').forEach(seg => seg.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; seg.querySelectorAll('button').forEach(x => x.classList.remove('on')); b.classList.add('on') }));
const segVal = id => +document.querySelector(`#${id} .on`).dataset.v;
function startGame() {
  TEST = segVal('optTest') === 1; loadCfg(); CFG.vpTarget = segVal('optVP');
  newGameState(segVal('optAI'), segVal('optSpd'));
  $('setup').hidden = true; $('game').hidden = false;
  log('Settling: everyone founds two towns, in snake order.');
  setupStep();
}
document.addEventListener('keydown', e => { if (e.key === 'Escape' && G && !ATK && !scorchResolve) { G.mode = null; G.sel = null; closeModal(); render() } });
