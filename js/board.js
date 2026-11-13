// ---------- geometry & map generation ----------
const S = 62, SQ3 = Math.sqrt(3);
const EDIR = [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]]; // neighbour across edge i
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296 } }
const rnd = n => Math.floor(Math.random() * n), d6 = () => 1 + rnd(6), ri = (a, b) => a + rnd(Math.max(0, b - a) + 1);
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1);[a[i], a[j]] = [a[j], a[i]] } return a };
const rep = (x, n) => Array(n).fill(x);
const emptyStock = () => ({ wood: 0, brick: 0, wheat: 0, sheep: 0, ore: 0 });
const pips = n => n ? 6 - Math.abs(7 - n) : 0;
function corner(x, y, i, s) { const a = Math.PI / 180 * (60 * i - 30); return [x + (s || S) * Math.cos(a), y + (s || S) * Math.sin(a)] }

function genBoard() {
  const R = 3, hexes = [], key = {}, verts = [], edges = [], ekey = {};
  for (let q = -R; q <= R; q++) for (let r = Math.max(-R, -q - R); r <= Math.min(R, -q + R); r++) hexes.push({ q, r });
  const types = shuffle([...rep('forest', 7), ...rep('fields', 7), ...rep('pasture', 7), ...rep('hills', 6), ...rep('mountain', 6), ...rep('desert', 4)]);
  const base = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12];
  const nums = shuffle([...base, ...shuffle([...base]).slice(0, 15)]);
  hexes.forEach((h, i) => {
    h.id = i; h.x = S * SQ3 * (h.q + h.r / 2); h.y = S * 1.5 * h.r; h.type = types[i]; h.num = h.type === 'desert' ? null : nums.pop();
    h.owner = -1; h.armies = 0; h.tired = 0; h.stock = emptyStock(); h.sent = 0; h.acc = 0; h.claimed = false; h.fed = 100; key[h.q + ',' + h.r] = i;
  });
  const findV = (x, y) => { for (const v of verts) if (Math.abs(v.x - x) < 1 && Math.abs(v.y - y) < 1) return v; const v = { id: verts.length, x, y, hexes: [], edges: [], adj: [], town: null }; verts.push(v); return v };
  hexes.forEach(h => {
    h.nb = EDIR.map(([dq, dr]) => { const k = key[(h.q + dq) + ',' + (h.r + dr)]; return k === undefined ? -1 : k });
    h.vs = []; for (let i = 0; i < 6; i++) { const [cx, cy] = corner(h.x, h.y, i); const v = findV(cx, cy); v.hexes.push(h.id); h.vs.push(v.id) }
  });
  hexes.forEach(h => {
    h.es = [];
    for (let i = 0; i < 6; i++) {
      const a = h.vs[i], b = h.vs[(i + 1) % 6], k = Math.min(a, b) + '-' + Math.max(a, b);
      if (ekey[k] === undefined) {
        ekey[k] = edges.length; edges.push({ id: edges.length, v: [a, b], hexes: [], road: false, ridge: false, x: (verts[a].x + verts[b].x) / 2, y: (verts[a].y + verts[b].y) / 2 });
        verts[a].edges.push(ekey[k]); verts[b].edges.push(ekey[k]); verts[a].adj.push(b); verts[b].adj.push(a);
      }
      edges[ekey[k]].hexes.push(h.id); h.es.push(ekey[k]);
    }
  });
  // keep 6s and 8s apart
  const hot = h => h.num === 6 || h.num === 8;
  for (let it = 0; it < 300; it++) {
    const bad = hexes.find(h => hot(h) && h.nb.some(n => n >= 0 && hot(hexes[n]))); if (!bad) break;
    const c = hexes.filter(h => h.num && !hot(h) && !h.nb.some(n => n >= 0 && hot(hexes[n]) && n !== bad.id));
    if (!c.length) break; const x = c[rnd(c.length)];[bad.num, x.num] = [x.num, bad.num];
  }
  // mountain ridges: impassable sides
  hexes.filter(h => h.type === 'mountain').forEach(h => {
    const k = ri(Math.max(0, Math.min(6, CFG.ridgeMin)), Math.max(0, Math.min(6, CFG.ridgeMax)));
    shuffle([...h.es]).slice(0, k).forEach(e => edges[e].ridge = true);
  });
  // never cut the island in two
  for (let guard = 0; guard < 200; guard++) {
    const seen = new Set([0]), q = [0];
    while (q.length) { const a = hexes[q.shift()]; a.nb.forEach((n, i) => { if (n >= 0 && !seen.has(n) && !edges[a.es[i]].ridge) { seen.add(n); q.push(n) } }) }
    if (seen.size === hexes.length) break;
    const fix = shuffle(edges.filter(e => e.ridge && e.hexes.length === 2 && seen.has(e.hexes[0]) !== seen.has(e.hexes[1])));
    if (!fix.length) break; fix[0].ridge = false;
  }
  return { hexes, verts, edges };
}
