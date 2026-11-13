// ---------- drawing ----------
const ICON = {
  wood: '<rect x="1" y="5" width="14" height="7" rx="3.5" fill="#8a5a2b"/><circle cx="12" cy="8.5" r="2.6" fill="#d9b382"/><circle cx="12" cy="8.5" r="1" fill="#8a5a2b"/>',
  brick: '<rect x="1" y="4" width="14" height="9" rx="1" fill="#b9502f"/><path d="M1 8.5h14M8 4v4.5M4.5 8.5V13M11.5 8.5V13" stroke="#f3c7ae" stroke-width="1"/>',
  wheat: '<path d="M8 15V5" stroke="#b98a1e" stroke-width="1.4"/><ellipse cx="8" cy="3.5" rx="1.8" ry="2.8" fill="#e8c23e"/><ellipse cx="5.2" cy="6.5" rx="1.5" ry="2.5" fill="#e8c23e" transform="rotate(-30 5.2 6.5)"/><ellipse cx="10.8" cy="6.5" rx="1.5" ry="2.5" fill="#e8c23e" transform="rotate(30 10.8 6.5)"/>',
  sheep: '<circle cx="6" cy="8" r="3.5" fill="#f4f1e6"/><circle cx="10" cy="7" r="3.5" fill="#f4f1e6"/><circle cx="9" cy="10.5" r="3" fill="#f4f1e6"/><circle cx="3.5" cy="9.5" r="2" fill="#3c3a37"/>',
  ore: '<polygon points="2,12 5,5 9,3 14,8 12,13 5,14" fill="#7d8597"/><polygon points="5,5 9,3 8,8" fill="#c3cad8"/>'
};
function ic(r) { return `<svg class="ri" viewBox="0 0 16 16" role="img" aria-label="${RINFO[r]}"><title>${RINFO[r]}</title>${ICON[r]}</svg>` }
const costText = c => Object.entries(c).map(([r, n]) => `${n}${ic(r)}`).join(' ') || 'free';
const f1 = n => n.toFixed(1);
function hexPts(x, y, s) { let p = []; for (let i = 0; i < 6; i++) { const c = corner(x, y, i, s); p.push(f1(c[0]) + ',' + f1(c[1])) } return p.join(' ') }
function rp(h, rng, rad) { for (; ;) { const x = rng() * 2 - 1, y = rng() * 2 - 1; if (x * x + y * y <= 1) return [h.x + x * S * .84 * rad, h.y + y * S * .84 * rad] } }
const pg = (pts, fill, extra) => `<polygon points="${pts.map(p => f1(p[0]) + ',' + f1(p[1])).join(' ')}" fill="${fill}" ${extra || ''}/>`;
const el = (x, y, rx, ry, fill, extra) => `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(rx)}" ry="${f1(ry)}" fill="${fill}" ${extra || ''}/>`;

// ----- terrain pieces (all lit from the upper left)
function pine(x, y, s, c) {
  const d = c < .5 ? ['#1d5633', '#2f7c47'] : ['#215f49', '#35895c'];
  let o = el(x + s * .2, y + s * .1, s * .44, s * .14, '#06200f', 'opacity=".35"') + `<rect x="${f1(x - s * .06)}" y="${f1(y - s * .15)}" width="${f1(s * .12)}" height="${f1(s * .3)}" fill="#4a3320"/>`;
  [[.46, 0, .62], [.37, .34, .58], [.27, .66, .5]].forEach(([w, b, hh]) => { const by = y - s * b, ty = by - s * hh; o += pg([[x - s * w, by], [x, ty], [x + s * w, by]], d[0]) + pg([[x - s * w, by], [x, ty], [x, by]], d[1]) });
  return o;
}
function leafy(x, y, s, c) {
  const g = c < .5 ? ['#2c7136', '#4a9848', '#7fbf63'] : ['#3b7a2c', '#5da342', '#93c860'];
  return el(x + s * .2, y + s * .08, s * .46, s * .15, '#06200f', 'opacity=".35"') + `<rect x="${f1(x - s * .07)}" y="${f1(y - s * .4)}" width="${f1(s * .14)}" height="${f1(s * .45)}" fill="#5a3d22"/>`
    + el(x + s * .22, y - s * .52, s * .31, s * .29, g[0]) + el(x - s * .22, y - s * .56, s * .33, s * .31, g[0]) + el(x, y - s * .82, s * .37, s * .35, g[1]) + el(x - s * .12, y - s * .93, s * .17, s * .15, g[2], 'opacity=".85"');
}
function mtn(x, y, w, hh, snow) {
  const t = y - hh, l = x - w / 2, r = x + w / 2, kx = x + w * .08, ky = y - hh * .36;
  let o = pg([[l, y], [x, t], [r, y]], '#8b8e99', 'stroke="#3d3f49" stroke-width=".9" stroke-linejoin="round"')
    + pg([[l, y], [x, t], [kx, ky], [x - w * .06, y]], '#b9bcc8') + pg([[x, t], [r, y], [x + w * .12, y], [kx, ky]], '#636674')
    + `<path d="M${f1(x + w * .2)},${f1(y - hh * .28)} l${f1(w * .1)},${f1(hh * .2)} M${f1(x - w * .22)},${f1(y - hh * .3)} l${f1(-w * .08)},${f1(hh * .22)} M${f1(x - w * .1)},${f1(y - hh * .5)} l${f1(-w * .05)},${f1(hh * .2)}" stroke="#474956" stroke-width=".8" opacity=".6" fill="none"/>`;
  if (snow) o += pg([[x, t], [x - w * .17, t + hh * .31], [x - w * .08, t + hh * .25], [x - w * .01, t + hh * .37], [x + w * .07, t + hh * .26], [x + w * .16, t + hh * .33]], '#fbfdff') + pg([[x, t], [x + w * .16, t + hh * .33], [x + w * .07, t + hh * .26], [x + w * .02, t + hh * .33]], '#cfd8e8');
  return o;
}
function sheepArt(x, y, d) { return el(x + 1, y + 5.5, 6.5, 2, '#0b2414', 'opacity=".3"') + `<path d="M${f1(x - 3)},${f1(y + 3)} v3 M${f1(x + 3)},${f1(y + 3)} v3" stroke="#3c3a37" stroke-width="1.3"/>` + el(x, y, 6.2, 4.4, '#fbf8ef', 'stroke="#b9b4a4" stroke-width=".6"') + el(x - 2, y - 1.5, 2.6, 2, '#ffffff') + `<circle cx="${f1(x + d * 6)}" cy="${f1(y - 1.5)}" r="2.3" fill="#3c3a37"/>` }
const ART = {
  forest(h, rng) {
    let s = ''; for (let i = 0; i < 6; i++) { const [x, y] = rp(h, rng, .9); s += el(x, y, 16 + rng() * 14, 9 + rng() * 7, '#24572f', 'opacity=".45"') }
    const ts = []; for (let i = 0; i < 18; i++) { const [x, y] = rp(h, rng, 1.02); ts.push([x, y, 12 + rng() * 7, rng(), rng() < .32]) } ts.sort((a, b) => a[1] - b[1]);
    ts.forEach(t => s += t[4] ? leafy(t[0], t[1] + t[2] * .4, t[2], t[3]) : pine(t[0], t[1] + t[2] * .45, t[2], t[3])); return s;
  },
  mountain(h, rng) {
    let s = ''; for (let i = 0; i < 5; i++) { const [x, y] = rp(h, rng, .9); s += el(x, y + 8, 18 + rng() * 14, 7 + rng() * 5, '#6f6a62', 'opacity=".5"') }
    const ps = []; for (let i = 0; i < 3; i++) { const [x, y] = rp(h, rng, .55); ps.push([x, y + 6, 44 + rng() * 22, 40 + rng() * 22, 1]) }
    for (let i = 0; i < 4; i++) { const [x, y] = rp(h, rng, .95); ps.push([x, y + 16, 22 + rng() * 14, 16 + rng() * 12, 0]) }
    ps.sort((a, b) => a[1] - b[1]); ps.forEach(p => s += el(p[0] + p[2] * .12, p[1] + 1, p[2] * .55, p[3] * .12, '#1d1d24', 'opacity=".3"') + mtn(p[0], p[1], p[2], p[3], p[4]));
    for (let i = 0; i < 4; i++) { const [x, y] = rp(h, rng, .95); s += pg([[x - 4, y + 3], [x - 2, y - 2], [x + 3, y - 3], [x + 5, y + 2]], '#777a86', 'stroke="#3d3f49" stroke-width=".6"') }
    return s;
  },
  hills(h, rng) {
    let s = ''; const ms = []; for (let i = 0; i < 8; i++) { const [x, y] = rp(h, rng, .95); ms.push([x, y + 9, 34 + rng() * 24, 11 + rng() * 9, rng()]) } ms.sort((a, b) => a[1] - b[1]);
    ms.forEach(([x, y, w, hh, c], i) => {
      const base = c < .33 ? '#c98a55' : c < .66 ? '#d79b66' : '#bf7f4c';
      s += `<path d="M${f1(x - w / 2)},${f1(y)} Q${f1(x)},${f1(y - hh * 2)} ${f1(x + w / 2)},${f1(y)} Z" fill="${base}" stroke="#7d4d2c" stroke-width="1"/><path d="M${f1(x + w * .05)},${f1(y - hh * .97)} Q${f1(x + w * .42)},${f1(y - hh * .6)} ${f1(x + w / 2)},${f1(y)} L${f1(x + w * .12)},${f1(y)} Q${f1(x + w * .25)},${f1(y - hh * .5)} ${f1(x + w * .05)},${f1(y - hh * .97)}Z" fill="#7a4526" opacity=".35"/><path d="M${f1(x - w * .3)},${f1(y - hh * .5)} q${f1(w * .16)},${f1(-hh * .45)} ${f1(w * .34)},${f1(-hh * .4)}" fill="none" stroke="#f6d3a4" stroke-width="1.6" opacity=".75" stroke-linecap="round"/>`;
      if (i === 4) s += el(x - w * .1, y - hh * .25, 9, 4.2, '#9c4a2d', 'stroke="#6b2d18" stroke-width=".7"') + el(x - w * .1, y - hh * .25, 5.5, 2.3, '#7a3620');
    });
    for (let i = 0; i < 6; i++) { const [x, y] = rp(h, rng, .95); s += el(x, y, 3.2, 2.6, '#5f8a3e') + el(x - 1, y - 1, 1.6, 1.3, '#86ad57') }
    return s;
  },
  fields(h, rng) {
    const pal = ['#e9c649', '#f3dc7c', '#d9b23a', '#cdd36d', '#b9c85a', '#eecf5c'], a = [-28, 14, 38, -8][Math.floor(rng() * 4)];
    let g = ''; for (let row = -3; row < 3; row++) {
      let x = -S - 10; while (x < S + 10) {
        const w = 26 + rng() * 26, c = pal[Math.floor(rng() * pal.length)], y = row * 24; let ln = '';
        for (let k = 1; k < 5; k++)ln += `<line x1="${f1(x + 2)}" y1="${f1(y + k * 4.8)}" x2="${f1(x + w - 2)}" y2="${f1(y + k * 4.8)}" stroke="#8a6d16" stroke-width=".9" opacity=".45"/>`;
        g += `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="24" fill="${c}"/>${ln}<rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="24" fill="none" stroke="#6f8736" stroke-width="2.2" opacity=".8"/>`; x += w;
      }
    }
    let s = `<g transform="translate(${f1(h.x)},${f1(h.y)}) rotate(${a})">${g}</g>`;
    const [fx, fy] = rp(h, rng, .55);
    s += el(fx + 3, fy + 2, 12, 3.5, '#3a2c08', 'opacity=".3"') + `<rect x="${f1(fx - 7)}" y="${f1(fy - 7)}" width="14" height="8" fill="#f4ead0" stroke="#5b4a2e" stroke-width=".6"/>` + pg([[fx - 8.5, fy - 7], [fx, fy - 13], [fx + 8.5, fy - 7]], '#a8452f', 'stroke="#5e1d14" stroke-width=".6"') + `<rect x="${f1(fx - 1.3)}" y="${f1(fy - 3.5)}" width="2.6" height="4.5" fill="#3a2a1c"/>`;
    for (let i = 0; i < 4; i++) { const [x, y] = rp(h, rng, .9); s += el(x + 1.5, y + .8, 6, 2, '#3a2c08', 'opacity=".3"') + `<path d="M${f1(x - 5)},${f1(y)} a5,6.5 0 0 1 10,0 Z" fill="#d9a82e" stroke="#8f6c14" stroke-width=".8"/><path d="M${f1(x - 2)},${f1(y - 4)} v3 M${f1(x + 1.5)},${f1(y - 5)} v4" stroke="#f3dc7c" stroke-width=".8"/>` }
    return s;
  },
  pasture(h, rng) {
    let s = ''; for (let i = 0; i < 6; i++) { const [x, y] = rp(h, rng, .9); s += el(x, y, 16 + rng() * 16, 8 + rng() * 8, rng() < .5 ? '#86bd62' : '#c9eaa0', 'opacity=".5"') }
    const [px, py] = rp(h, rng, .6); s += el(px, py + 1, 15, 7.5, '#3d87ad') + el(px, py, 14, 6.5, '#6fc0dd') + el(px - 4, py - 2, 5, 1.6, '#d6f1fa', 'opacity=".8"');
    const [qx, qy] = rp(h, rng, .6); s += `<path d="M${f1(qx - 17)},${f1(qy - 9)} h34 v18 h-34 Z M${f1(qx - 17)},${f1(qy - 3)} h34 M${f1(qx - 17)},${f1(qy + 3)} h34" fill="none" stroke="#8a6a42" stroke-width="1.3"/>`;
    for (let k = 0; k <= 4; k++)s += `<path d="M${f1(qx - 17 + k * 8.5)},${f1(qy - 11)} v4 M${f1(qx - 17 + k * 8.5)},${f1(qy + 7)} v4" stroke="#5c4022" stroke-width="1.6"/>`;
    for (let i = 0; i < 14; i++) { const [x, y] = rp(h, rng, 1); s += `<path d="M${f1(x)},${f1(y)} l-2.5,-5 M${f1(x)},${f1(y)} l0,-6.5 M${f1(x)},${f1(y)} l2.5,-5" stroke="#4f9140" stroke-width="1.2" fill="none"/>` }
    for (let i = 0; i < 16; i++) { const [x, y] = rp(h, rng, 1); s += `<circle cx="${f1(x)}" cy="${f1(y)}" r="1.3" fill="${['#fff', '#ffe36e', '#ffc2d4'][i % 3]}"/>` }
    for (let i = 0; i < 5; i++) { const [x, y] = rp(h, rng, .88); s += sheepArt(x, y, rng() < .5 ? -1 : 1) }
    return s;
  },
  desert(h, rng) {
    let s = ''; const ds = []; for (let i = 0; i < 6; i++) { const [x, y] = rp(h, rng, .95); ds.push([x, y + 6, 20 + rng() * 14, 9 + rng() * 6]) } ds.sort((a, b) => a[1] - b[1]);
    ds.forEach(([x, y, w, hh]) => s += `<path d="M${f1(x - w)},${f1(y)} Q${f1(x - w * .1)},${f1(y - hh * 2)} ${f1(x + w)},${f1(y)} Q${f1(x)},${f1(y - hh * .5)} ${f1(x - w)},${f1(y)}Z" fill="#f6e7bb"/><path d="M${f1(x - w * .1)},${f1(y - hh * .98)} Q${f1(x + w * .6)},${f1(y - hh * .6)} ${f1(x + w)},${f1(y)} Q${f1(x + w * .3)},${f1(y - hh * .45)} ${f1(x - w * .1)},${f1(y - hh * .98)}Z" fill="#b8935a" opacity=".55"/><path d="M${f1(x - w * .8)},${f1(y + 4)} q${f1(w * .4)},-3 ${f1(w * .8)},0 t${f1(w * .8)},0" fill="none" stroke="#c9aa6e" stroke-width="1" opacity=".8"/>`);
    const [ox, oy] = rp(h, rng, .5); s += el(ox, oy + 1, 12, 5.5, '#6f9a4c') + el(ox, oy, 8.5, 3.6, '#5fb4d6');
    [[-9, -1], [9, 1]].forEach(([dx, dy], k) => { const x = ox + dx, y = oy + dy, d = k ? 1 : -1; s += `<path d="M${f1(x)},${f1(y)} q${d * 2},-9 ${d * 1},-16" stroke="#7a5a32" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M${f1(x + d)},${f1(y - 16)} q-8,-4 -11,2 M${f1(x + d)},${f1(y - 16)} q8,-4 11,2 M${f1(x + d)},${f1(y - 16)} q-5,-8 -9,-6 M${f1(x + d)},${f1(y - 16)} q5,-8 9,-6 M${f1(x + d)},${f1(y - 16)} q0,-8 1,-10" stroke="#3f8a45" stroke-width="2.2" fill="none" stroke-linecap="round"/>` });
    for (let i = 0; i < 2; i++) { const [x, y] = rp(h, rng, .9); s += `<path d="M${f1(x)},${f1(y)} v-14 M${f1(x - 5)},${f1(y - 5)} v-5 h5 M${f1(x + 5)},${f1(y - 7)} v-4 h-5" stroke="#4f7f3f" stroke-width="3.2" stroke-linecap="round" fill="none"/>` }
    for (let i = 0; i < 4; i++) { const [x, y] = rp(h, rng, .95); s += el(x + 1, y + 1.5, 5, 2, '#5c4420', 'opacity=".3"') + el(x, y, 4.5, 2.8, '#a98d63', 'stroke="#6f5a3a" stroke-width=".5"') }
    return s;
  }
};
const GRAD = { forest: ['#5fa35a', '#3a7a45'], mountain: ['#aaa69d', '#7a756d'], hills: ['#dba571', '#b9794a'], fields: ['#f0d46c', '#d9b446'], pasture: ['#b9e08c', '#8fc468'], desert: ['#f0dfae', '#d9c183'] };
function ridgeArt(e, rng) {
  const a = V(e.v[0]), b = V(e.v[1]), ps = [];
  let s = `<line x1="${f1(a.x)}" y1="${f1(a.y)}" x2="${f1(b.x)}" y2="${f1(b.y)}" stroke="#2c2b33" stroke-width="12" stroke-linecap="round"/><line x1="${f1(a.x)}" y1="${f1(a.y)}" x2="${f1(b.x)}" y2="${f1(b.y)}" stroke="#5a5c69" stroke-width="7" stroke-linecap="round"/>`;
  for (let i = 0; i < 6; i++) { const t = .06 + i * .176; ps.push([a.x + (b.x - a.x) * t + (rng() - .5) * 5, a.y + (b.y - a.y) * t + 6 + (rng() - .5) * 4, 17 + rng() * 7, 17 + rng() * 9]) }
  ps.sort((p, q) => p[1] - q[1]).forEach(p => s += mtn(p[0], p[1], p[2], p[3], 1)); return s;
}

// The scenery is drawn once as its own SVG and shown as an image, so its textures are rasterised a single time.
function buildStatic() {
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; G.hexes.forEach(h => { x0 = Math.min(x0, h.x); x1 = Math.max(x1, h.x); y0 = Math.min(y0, h.y); y1 = Math.max(y1, h.y) });
  const pad = S * 1.75, vb = [x0 - pad, y0 - pad, x1 - x0 + 2 * pad, y1 - y0 + 2 * pad], R = `x="${f1(vb[0])}" y="${f1(vb[1])}" width="${f1(vb[2])}" height="${f1(vb[3])}"`, seed = G.seed % 97;
  let defs = `<radialGradient id="sea" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#3aa3b8"/><stop offset=".6" stop-color="#1f7391"/><stop offset="1" stop-color="#0f4763"/></radialGradient>
    <radialGradient id="vig" cx="50%" cy="50%" r="50%"><stop offset=".8" stop-color="#0f4763" stop-opacity="0"/><stop offset="1" stop-color="#0f4763" stop-opacity="1"/></radialGradient>
    <filter id="coast" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="0.017" numOctaves="3" seed="${seed}"/><feDisplacementMap in="SourceGraphic" scale="24" xChannelSelector="R" yChannelSelector="G"/></filter>
    <filter id="lsh" x="-10%" y="-10%" width="120%" height="120%"><feDropShadow dx="0" dy="5" stdDeviation="7" flood-color="#03202c" flood-opacity=".55"/></filter>
    <filter id="tex" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.022" numOctaves="4" seed="${seed + 3}" result="n1"/><feColorMatrix in="n1" type="matrix" values="0 0 0 0 .05  0 0 0 0 .12  0 0 0 0 .05  0 0 0 1.5 -.72" result="shade"/>
      <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="3" seed="${seed + 9}" result="n3"/><feColorMatrix in="n3" type="matrix" values="0 0 0 0 1  0 0 0 0 .97  0 0 0 0 .8  0 0 0 1.3 -.6" result="light"/>
      <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="${seed + 5}" result="n2"/><feColorMatrix in="n2" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .5 -.2" result="grain"/>
      <feMerge result="m"><feMergeNode in="SourceGraphic"/><feMergeNode in="shade"/><feMergeNode in="light"/><feMergeNode in="grain"/></feMerge><feComposite in="m" in2="SourceAlpha" operator="in"/></filter>
    <filter id="seatex" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.008 0.03" numOctaves="3" seed="${seed + 1}"/><feColorMatrix type="matrix" values="0 0 0 0 .8  0 0 0 0 .96  0 0 0 0 1  0 0 0 1.5 -.7"/></filter>`;
  for (const k in GRAD) defs += `<linearGradient id="g_${k}" x1="0" y1="0" x2=".5" y2="1"><stop offset="0" stop-color="${GRAD[k][0]}"/><stop offset="1" stop-color="${GRAD[k][1]}"/></linearGradient>`;
  const rng = mulberry32(G.seed), all = s => G.hexes.map(h => `<polygon points="${hexPts(h.x, h.y, s)}"/>`).join('');
  let o = `<rect ${R} fill="url(#sea)"/><rect ${R} filter="url(#seatex)" opacity=".5"/>`;
  for (let i = 0; i < 90; i++) { const x = vb[0] + rng() * vb[2], y = vb[1] + rng() * vb[3]; o += `<path d="M${f1(x)},${f1(y)} q5,-4 10,0 t10,0" fill="none" stroke="#d3f0f5" stroke-width="1.3" opacity=".2" stroke-linecap="round"/>` }
  o += `<g filter="url(#coast)"><g fill="#4fc0cc" opacity=".28">${all(S + 40)}</g><g fill="#7fd9d8" opacity=".38">${all(S + 25)}</g><g fill="#ffffff" opacity=".55">${all(S + 14)}</g></g>`;
  o += `<g filter="url(#lsh)"><g filter="url(#coast)" fill="#ecdcae" stroke="#ecdcae" stroke-width="5" stroke-linejoin="round">${all(S + 10)}</g></g>`;
  let land = '';
  G.hexes.forEach(h => {
    defs += `<clipPath id="hc${h.id}"><polygon points="${hexPts(h.x, h.y, S + .4)}"/></clipPath>`;
    land += `<polygon points="${hexPts(h.x, h.y, S + .6)}" fill="url(#g_${h.type})"/><g clip-path="url(#hc${h.id})">${ART[h.type](h, mulberry32(h.id * 7919 + G.seed))}</g>`;
  });
  o += `<g filter="url(#tex)">${land}</g>`;
  G.hexes.forEach(h => o += `<polygon points="${hexPts(h.x, h.y, S)}" fill="none" stroke="#1c2a1a" stroke-opacity=".42" stroke-width="1.5" stroke-linejoin="round"/>`);
  G.edges.forEach(e => { if (e.ridge) o += ridgeArt(e, mulberry32(e.id * 31 + G.seed)) });
  o += `<rect ${R} fill="url(#vig)"/>`;
  // compass rose and a couple of ships
  const cx = vb[0] + 64, cy = vb[1] + vb[3] - 66, star = (r1, r2, rot) => { const p = []; for (let i = 0; i < 8; i++) { const a = Math.PI / 4 * i + rot, r = i % 2 ? r2 : r1; p.push([cx + r * Math.sin(a), cy - r * Math.cos(a)]) } return p };
  o += `<g opacity=".8"><circle cx="${f1(cx)}" cy="${f1(cy)}" r="34" fill="none" stroke="#e9d9a8" stroke-width="1.4"/><circle cx="${f1(cx)}" cy="${f1(cy)}" r="29" fill="none" stroke="#e9d9a8" stroke-width=".6"/>${pg(star(26, 6, Math.PI / 4), '#b9a36a')}${pg(star(34, 7, 0), '#f0e2b6')}<path d="M${f1(cx)},${f1(cy - 34)} L${f1(cx + 5)},${f1(cy)} L${f1(cx)},${f1(cy)} Z" fill="#b34a36"/><path d="M${f1(cx - 4)},${f1(cy - 40)} v-9 l8,9 v-9" fill="none" stroke="#f0e2b6" stroke-width="1.8"/></g>`;
  [[vb[0] + vb[2] - 90, vb[1] + 80, 1], [vb[0] + 110, vb[1] + 110, -1]].forEach(([x, y, d]) => o += `<g transform="translate(${f1(x)},${f1(y)}) scale(${d},1)"><path d="M-22,6 q8,-4 16,0 t16,0 t16,0" fill="none" stroke="#e6f6f8" stroke-width="1.4" opacity=".6"/><path d="M-14,0 h28 l-5,7 h-18 Z" fill="#6b4526" stroke="#2c1a0b" stroke-width=".8"/><path d="M0,0 v-26" stroke="#2c1a0b" stroke-width="1.4"/><path d="M1.5,-25 q13,9 1,22 Z" fill="#f6efe0" stroke="#8d8674" stroke-width=".6"/><path d="M-1.5,-21 q-10,8 -1,18 Z" fill="#e9e0cb" stroke="#8d8674" stroke-width=".6"/><path d="M0,-26 l7,-2 l-7,-2" fill="#b34a36"/></g>`);
  return { vb, svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.map(f1).join(' ')}" width="${Math.round(vb[2] * 2)}" height="${Math.round(vb[3] * 2)}"><defs>${defs}</defs>${o}</svg>` };
}
function initBoard() {
  const svg = document.getElementById('board'), st = G.static = buildStatic(), vb = st.vb;
  svg.setAttribute('viewBox', vb.map(f1).join(' '));
  const R = `x="${f1(vb[0])}" y="${f1(vb[1])}" width="${f1(vb[2])}" height="${f1(vb[3])}"`;
  let url = ''; try { url = URL.createObjectURL(new Blob([st.svg], { type: 'image/svg+xml' })) } catch (e) { }
  svg.innerHTML = `<rect x="-9000" y="-9000" width="18000" height="18000" fill="#0f4763"/><image id="bgimg" ${R} preserveAspectRatio="none" href="${url}"/><g id="dyn" pointer-events="none"></g><g id="hits"></g>`;
  const img = document.getElementById('bgimg'), inline = () => { if (G.static.inlined) return; G.static.inlined = true; const g = document.createElementNS('http://www.w3.org/2000/svg', 'g'); g.setAttribute('pointer-events', 'none'); g.innerHTML = st.svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, ''); img.replaceWith(g) };
  if (!url) inline(); else img.addEventListener('error', inline);
}

// ----- pieces
function soldier(x, y, sc, P) {
  const c = P.color, d = P.dark, g = `<g transform="translate(${f1(x)},${f1(y)}) scale(${sc})">`;
  if (P.barb) return g + `<rect x="-3.6" y="-7" width="3" height="7" rx="1" fill="#2a211c"/><rect x=".6" y="-7" width="3" height="7" rx="1" fill="#2a211c"/><path d="M-6.2,-6.5 L-5.2,-17 Q0,-20.5 5.2,-17 L6.2,-6.5 Z" fill="#7a6248" stroke="#2a211c" stroke-width=".8"/><path d="M-5.2,-17 Q0,-13 5.2,-17 L5.6,-13 Q0,-9.5 -5.6,-13Z" fill="#a08a6a"/><circle cx="0" cy="-21.2" r="4.4" fill="#d9a878" stroke="#2a211c" stroke-width=".6"/><path d="M-4.7,-21.8 Q0,-29 4.7,-21.8 Z" fill="#3a2d24"/><path d="M-4,-25 L-7.4,-29 M4,-25 L7.4,-29" stroke="#f3ecd9" stroke-width="1.6" stroke-linecap="round"/><circle cx="-1.6" cy="-20.6" r=".6" fill="#2a211c"/><circle cx="1.6" cy="-20.6" r=".6" fill="#2a211c"/><path d="M7.6,-3 L9.6,-19" stroke="#4d3520" stroke-width="2.4" stroke-linecap="round"/><ellipse cx="9.8" cy="-20.5" rx="2.6" ry="3.4" fill="#5c5f6b" stroke="#2a211c" stroke-width=".6"/></g>`;
  return g + `<rect x="-3.6" y="-7" width="3" height="7" rx="1" fill="#33271f"/><rect x=".6" y="-7" width="3" height="7" rx="1" fill="#33271f"/><path d="M-5.4,-6.5 L-5,-16.5 Q0,-19.5 5,-16.5 L5.4,-6.5 Z" fill="${c}" stroke="${d}" stroke-width=".9"/><path d="M-1.6,-18 v11" stroke="#fff" stroke-width="1.6" opacity=".28"/><path d="M-5.3,-10.2 h10.6" stroke="${d}" stroke-width="1.6"/><circle cx="0" cy="-21.6" r="4.2" fill="#f1cba3" stroke="#5a3a22" stroke-width=".5"/><circle cx="-1.5" cy="-21" r=".55" fill="#2a1c10"/><circle cx="1.5" cy="-21" r=".55" fill="#2a1c10"/><path d="M-4.9,-21.9 A4.9,4.9 0 0 1 4.9,-21.9 L4.9,-20.6 L-4.9,-20.6 Z" fill="#c2cad3" stroke="#4a525c" stroke-width=".6"/><path d="M0,-22 v2.6" stroke="#4a525c" stroke-width=".9"/><path d="M0,-26.6 q3.4,-3.6 5.2,.6 q-2.6,-1 -5.2,1.6 Z" fill="${c}" stroke="${d}" stroke-width=".4"/><line x1="7.2" y1="0" x2="7.2" y2="-27" stroke="#5a3d22" stroke-width="1.4"/><polygon points="7.2,-31.5 5.4,-26.5 9,-26.5" fill="#dfe6ec" stroke="#4a525c" stroke-width=".5"/><circle cx="-4.6" cy="-11.4" r="5" fill="${d}" stroke="#f3ead2" stroke-width="1.1"/><path d="M-4.6,-15 v7.2 M-8.2,-11.4 h7.2" stroke="${c}" stroke-width="1.5"/><circle cx="-4.6" cy="-11.4" r="1.3" fill="#f3ead2"/></g>`;
}
function sack(x, y, n) { return `<g transform="translate(${f1(x)},${f1(y)})"><path d="M-7,7 Q-10,-2 -3.5,-5.5 L3.5,-5.5 Q10,-2 7,7 Z" fill="#b89055" stroke="#4d3615" stroke-width="1"/><path d="M-3.5,-5.5 L-4.5,-9 L4.5,-9 L3.5,-5.5Z" fill="#8b6a38" stroke="#4d3615" stroke-width=".8"/><text x="0" y="5" text-anchor="middle" font-size="9" font-weight="800" fill="#2b1d08">${n}</text></g>` }
function cacheArt(h) {
  const n = stotal(h.stock), x = h.x, y = h.y + 36;
  return el(x + 1, y + 2, 17, 4.5, '#000', 'opacity=".3"') + `<rect x="${f1(x - 14)}" y="${f1(y - 10)}" width="11" height="11" fill="#a9793f" stroke="#4d3615" stroke-width=".9"/><path d="M${f1(x - 14)},${f1(y - 10)} l11,11 M${f1(x - 3)},${f1(y - 10)} l-11,11" stroke="#6b4a22" stroke-width=".9"/><rect x="${f1(x - 8)}" y="${f1(y - 19)}" width="9" height="9" fill="#bf8b4b" stroke="#4d3615" stroke-width=".9"/>` + sack(x + 8, y - 6, n);
}
function hungerBar(x, y, fed) { if (fed >= 99.5) return ''; const c = fed < CFG.starveBelow ? '#e2574c' : fed < 70 ? '#f0b63c' : '#7ccf6a'; return `<rect x="${f1(x - 14)}" y="${f1(y)}" width="28" height="5" rx="2.5" fill="#0d1a22" stroke="#fff" stroke-width=".7"/><rect x="${f1(x - 13)}" y="${f1(y + 1)}" width="${f1(26 * Math.max(.04, fed / 100))}" height="3" rx="1.5" fill="${c}"/>` }
function armyArt(h) {
  const P = G.P[h.owner], x = h.x, y = h.y + 44;
  const pos = h.armies === 1 ? [[0, 0]] : h.armies === 2 ? [[-9.5, 0], [9.5, 0]] : [[-16, -3], [16, -3], [0, 2]];
  let s = el(x, y + 1.5, 10 + pos.length * 7.5, 5.5, '#000', 'opacity=".32"');
  pos.forEach(([dx, dy]) => s += soldier(x + dx, y + dy, 1.12, P));
  if (h.armies >= 3) s += `<circle cx="${f1(x)}" cy="${f1(y - 40.5)}" r="9" fill="${P.dark}" stroke="#fff" stroke-width="1.6"/><text x="${f1(x)}" y="${f1(y - 36.3)}" text-anchor="middle" font-size="12" font-weight="800" fill="#fff">${h.armies}</text>`;
  if (!P.barb) s += hungerBar(x, y + 5, h.fed);
  const st = stotal(h.stock); if (st) s += sack(x + 37, y - 8, st);
  return s;
}
function bld(b, th) {
  const x = b.x, y = b.y, w = b.w, h = b.h, roof = b.alt ? th.roof2 : th.roof, door = `<rect x="${f1(x - 1)}" y="${f1(y - 2.8)}" width="2" height="2.8" fill="#3a2a1c"/>`, shade = `<rect x="${f1(x + w * .18)}" y="${f1(y - h)}" width="${f1(w * .32)}" height="${f1(h)}" fill="#000" opacity=".16"/>`, win = b.w > 9 ? `<rect x="${f1(x - w / 2 + 1.3)}" y="${f1(y - h + 1.4)}" width="1.7" height="1.7" fill="#ffe9a8"/>` : '';
  if (th === THEME.desert) return `<rect x="${f1(x - w / 2)}" y="${f1(y - h)}" width="${f1(w)}" height="${f1(h)}" fill="${th.wall}" stroke="#0005" stroke-width=".5"/>${shade}<rect x="${f1(x - w / 2 - .8)}" y="${f1(y - h - 1.6)}" width="${f1(w + 1.6)}" height="1.8" fill="${roof}"/>${b.alt ? `<path d="M${f1(x - 2.6)},${f1(y - h - 1.6)} a2.6,2.8 0 0 1 5.2,0Z" fill="#cfa25e" stroke="#0004" stroke-width=".4"/>` : ''}${door}${win}`;
  return `<rect x="${f1(x - w / 2)}" y="${f1(y - h)}" width="${f1(w)}" height="${f1(h)}" fill="${th.wall}" stroke="#0006" stroke-width=".5"/>${shade}<polygon points="${f1(x - w / 2 - 1.4)},${f1(y - h)} ${f1(x)},${f1(y - h - b.rh)} ${f1(x + w / 2 + 1.4)},${f1(y - h)}" fill="${roof}" stroke="#0006" stroke-width=".5"/><polygon points="${f1(x)},${f1(y - h - b.rh)} ${f1(x + w / 2 + 1.4)},${f1(y - h)} ${f1(x + w * .12)},${f1(y - h)}" fill="#000" opacity=".18"/>${door}${win}`;
}
const LANDMARK = {
  mountain: (x, y) => `<rect x="${x - 3.5}" y="${y - 19}" width="7" height="19" fill="#b3b6bf" stroke="#4c4c57" stroke-width=".6"/><rect x="${x + .6}" y="${y - 19}" width="2.9" height="19" fill="#000" opacity=".18"/><path d="M${x - 4.5},${y - 19} v-3 h2.2 v2 h1.2 v-2 h2.2 v2 h1.2 v-2 h2.2 v3 Z" fill="#b3b6bf" stroke="#4c4c57" stroke-width=".6"/><rect x="${x - 1}" y="${y - 14}" width="2" height="3.5" fill="#2e3038"/>`,
  fields: (x, y) => `<polygon points="${x - 4},${y} ${x - 2.6},${y - 13} ${x + 2.6},${y - 13} ${x + 4},${y}" fill="#f4ead0" stroke="#6b5a34" stroke-width=".6"/><polygon points="${x - 3.4},${y - 13} ${x},${y - 17} ${x + 3.4},${y - 13}" fill="#9b3a2c"/><g class="mill" style="transform-origin:${x}px ${y - 14}px"><path d="M${x - 8},${y - 21} L${x + 8},${y - 7} M${x + 8},${y - 21} L${x - 8},${y - 7}" stroke="#5a4426" stroke-width="1.5" stroke-linecap="round"/></g><circle cx="${x}" cy="${y - 14}" r="1.3" fill="#3a2a1c"/>`,
  hills: (x, y) => `<rect x="${x - 2.3}" y="${y - 17}" width="4.6" height="17" fill="#a34a30" stroke="#5a2415" stroke-width=".6"/><rect x="${x - 3}" y="${y - 18.5}" width="6" height="2" fill="#7a3220"/>`,
  forest: (x, y) => `<path d="M${x - 3.5},${y} L${x - 2.5},${y - 13} M${x + 3.5},${y} L${x + 2.5},${y - 13}" stroke="#5c4022" stroke-width="1.4"/><rect x="${x - 4.5}" y="${y - 17}" width="9" height="4.5" fill="#8a6038" stroke="#3d2a14" stroke-width=".6"/><polygon points="${x - 5.5},${y - 17} ${x},${y - 22} ${x + 5.5},${y - 17}" fill="#3f5a34" stroke="#22331c" stroke-width=".5"/>`,
  pasture: (x, y) => `<rect x="${x - 6.5}" y="${y - 8}" width="13" height="8" fill="#b5412f" stroke="#5e1d14" stroke-width=".6"/><polygon points="${x - 7.5},${y - 8} ${x - 4.5},${y - 12.5} ${x},${y - 14.5} ${x + 4.5},${y - 12.5} ${x + 7.5},${y - 8}" fill="#7d2a1f" stroke="#5e1d14" stroke-width=".5"/><rect x="${x - 2.4}" y="${y - 5.5}" width="4.8" height="5.5" fill="#f7f2e6"/><path d="M${x - 2.4},${y - 5.5} l4.8,5.5 M${x + 2.4},${y - 5.5} l-4.8,5.5" stroke="#b5412f" stroke-width=".8"/>`,
  desert: (x, y) => `<rect x="${x - 5}" y="${y - 7}" width="10" height="7" fill="#e6c891" stroke="#7b6235" stroke-width=".6"/><path d="M${x - 5},${y - 7} a5,6 0 0 1 10,0Z" fill="#d9a441" stroke="#7b6235" stroke-width=".6"/><rect x="${x + 6.5}" y="${y - 18}" width="2.6" height="18" fill="#e6c891" stroke="#7b6235" stroke-width=".5"/><polygon points="${x + 6},${y - 18} ${x + 7.8},${y - 22} ${x + 9.6},${y - 18}" fill="#d9a441"/>`
};
const smoke = (x, y) => `<circle class="smoke" cx="${x}" cy="${y}" r="2.4" fill="#f1eee8"/><circle class="smoke s2" cx="${x + 1}" cy="${y}" r="3" fill="#f1eee8"/>`;
function townArt(v) {
  const t = v.town, P = G.P[t.owner], th = THEME[t.theme], rng = mulberry32(v.id * 131 + 7), sc = 1 + .09 * (t.pop - 1);
  let s = el(0, 9, 35, 21, '#000', 'opacity=".32"') + el(0, 5, 32.5, 20.5, P.dark) + el(0, 4.3, 31, 19.3, th.ground, `stroke="${P.color}" stroke-width="3"`) + el(-6, 1, 18, 9, '#fff', 'opacity=".13"')
    + `<path d="M-26,7 Q0,1 26,6 M-2,-11 Q2,6 -1,21" fill="none" stroke="#e9d7ab" stroke-width="2.4" opacity=".75" stroke-linecap="round"/>`;
  if (touches(v, 'forest') && !t.walls) s += `<ellipse cx="0" cy="5" rx="27" ry="16" fill="none" stroke="#5c4022" stroke-width="4" stroke-dasharray="2.2 1.5"/>`;
  if (t.walls) s += `<ellipse cx="0" cy="6.2" rx="27.5" ry="16.5" fill="none" stroke="#4c4c57" stroke-width="7"/><ellipse cx="0" cy="5" rx="27.5" ry="16.5" fill="none" stroke="#8f929c" stroke-width="6"/><ellipse cx="0" cy="5" rx="27.5" ry="16.5" fill="none" stroke="#cfd2da" stroke-width="3.2" stroke-dasharray="4 2.2"/>`;
  const items = [], n = Math.min(13, 3 + t.pop * 2);
  for (let i = 0; i < n; i++) { const a = rng() * Math.PI * 2, r = .35 + .65 * Math.sqrt(rng()); items.push({ k: 'b', x: Math.cos(a) * r * 20, y: 6 + Math.sin(a) * r * 10.5, w: 7 + rng() * 4.5, h: 5 + rng() * 3.5, rh: 4 + rng() * 3, alt: rng() < .4 }) }
  if (t.pop >= 2) items.push({ k: 'lm', x: 13, y: 3 });
  if (t.pop >= 3) items.push({ k: 'hall', x: -2, y: 8 });
  if (isCoast(v)) items.push({ k: 'light', x: -20, y: 9 });
  items.sort((a, b) => a.y - b.y);
  items.forEach(b => {
    if (b.k === 'b') s += el(b.x + 1.5, b.y + .5, b.w * .6, 1.6, '#000', 'opacity=".25"') + bld(b, th);
    else if (b.k === 'lm') s += LANDMARK[t.theme](b.x, b.y) + (t.theme === 'hills' ? smoke(b.x, b.y - 21) : '');
    else if (b.k === 'hall') s += `<rect x="${b.x - 7}" y="${b.y - 9}" width="14" height="9" fill="${th.wall}" stroke="#0007" stroke-width=".6"/><rect x="${b.x + 2}" y="${b.y - 9}" width="5" height="9" fill="#000" opacity=".16"/><polygon points="${b.x - 8.5},${b.y - 9} ${b.x},${b.y - 17} ${b.x + 8.5},${b.y - 9}" fill="${P.color}" stroke="${P.dark}" stroke-width=".7"/><rect x="${b.x - 1.5}" y="${b.y - 4.5}" width="3" height="4.5" fill="#3a2a1c"/><rect x="${b.x - 5}" y="${b.y - 7}" width="2" height="2" fill="#ffe9a8"/><rect x="${b.x + 3}" y="${b.y - 7}" width="2" height="2" fill="#ffe9a8"/>` + smoke(b.x + 4, b.y - 16);
    else s += `<polygon points="${b.x - 2.8},${b.y} ${b.x - 1.8},${b.y - 14} ${b.x + 1.8},${b.y - 14} ${b.x + 2.8},${b.y}" fill="#f7f4ec" stroke="#555" stroke-width=".5"/><rect x="${b.x - 2.3}" y="${b.y - 9}" width="4.6" height="2.6" fill="#c8402f"/><rect x="${b.x - 2.2}" y="${b.y - 17}" width="4.4" height="3" fill="#ffd86b" stroke="#555" stroke-width=".5"/><polygon points="${b.x - 3},${b.y - 17} ${b.x},${b.y - 20} ${b.x + 3},${b.y - 17}" fill="#c8402f"/>`;
  });
  if (t.walls) [[-27.5, 6], [27.5, 6], [0, 22]].forEach(([x, y]) => s += `<rect x="${x - 3.2}" y="${y - 10}" width="6.4" height="10" fill="#b3b6bf" stroke="#4c4c57" stroke-width=".6"/><rect x="${x + .4}" y="${y - 10}" width="2.8" height="10" fill="#000" opacity=".18"/><path d="M${x - 4},${y - 10} v-2.6 h2 v1.6 h1.2 v-1.6 h1.6 v1.6 h1.2 v-1.6 h2 v2.6 Z" fill="#b3b6bf" stroke="#4c4c57" stroke-width=".6"/>`);
  s += `<line x1="-12" y1="-4" x2="-12" y2="-28" stroke="#3a2a1c" stroke-width="1.3"/><path class="flag" d="M-12,-28 q6,-2.5 13,1 q-6,3 -13,6 Z" fill="${P.color}" stroke="${P.dark}" stroke-width=".7"/>`;
  // Civ-style name banner; sits on the hex border so it never covers a number token
  const above = v.hexes.some(id => Math.abs(H(id).x - v.x) < 1 && H(id).y > v.y), st = stotal(t.stock), w = t.name.length * 5.3 + 23 + (st && !above ? 17 : 0);
  const ly = above ? v.y - 31 * sc - 17 : v.y + 27 * sc, lx = v.x - w / 2;
  const label = `<rect x="${f1(lx)}" y="${f1(ly)}" width="${f1(w)}" height="15" rx="7.5" fill="#0d1a22" fill-opacity=".9" stroke="${P.color}" stroke-width="1.2"/><circle cx="${f1(lx + 8)}" cy="${f1(ly + 7.5)}" r="6.3" fill="${P.color}"/><text x="${f1(lx + 8)}" y="${f1(ly + 11)}" text-anchor="middle" font-size="9.5" font-weight="800" fill="#fff">${t.pop}</text><text x="${f1(lx + 18)}" y="${f1(ly + 11)}" font-size="9.5" font-weight="700" fill="#f3ead2">${t.name}</text>${st ? (above ? sack(v.x + 37 * sc, v.y + 13, st) : `<text x="${f1(lx + w - 6)}" y="${f1(ly + 11)}" text-anchor="end" font-size="9.5" font-weight="800" fill="#e7c477">${st}</text>`) : ''}${hungerBar(v.x, above ? ly - 7 : ly + 17, t.fed)}`;
  return `<g transform="translate(${f1(v.x)},${f1(v.y)}) scale(${f1(sc * 10) / 10})">${s}</g>${label}`;
}
function roadArt(e) {
  const a = V(e.v[0]), b = V(e.v[1]), L = `x1="${f1(a.x)}" y1="${f1(a.y)}" x2="${f1(b.x)}" y2="${f1(b.y)}" stroke-linecap="round"`;
  return `<line ${L} stroke="#000" stroke-width="12" opacity=".22"/><line ${L} stroke="#4f3a1d" stroke-width="9.5"/><line ${L} stroke="#dcc08a" stroke-width="6.4"/><line ${L} stroke="#f3e2b8" stroke-width="2" opacity=".6"/><line ${L} stroke="#8f7343" stroke-width="1.1" stroke-dasharray="1.5 6"/>`;
}
function tokenArt(h) {
  if (!h.num) return ''; const hot = h.num === 6 || h.num === 8, lit = G.lastRoll === h.num && G.dice, x = h.x, y = h.y - 17, n = pips(h.num);
  let d = ''; for (let i = 0; i < n; i++) d += `<circle cx="${f1(x - (n - 1) * 1.9 + i * 3.8)}" cy="${f1(y + 7.5)}" r="1.25" fill="${hot ? '#b3261e' : '#4a3c26'}"/>`;
  return `<circle cx="${f1(x + .8)}" cy="${f1(y + 2)}" r="14" fill="#000" opacity=".35"/><circle cx="${f1(x)}" cy="${f1(y)}" r="13.5" fill="${lit ? '#ffe27a' : '#f5ecd4'}" stroke="${lit ? '#fff' : '#5b4a2e'}" stroke-width="${lit ? 2.4 : 1.2}"/><circle cx="${f1(x)}" cy="${f1(y)}" r="11.3" fill="none" stroke="#5b4a2e" stroke-width=".5" opacity=".5"/><text x="${f1(x)}" y="${f1(y + 3)}" text-anchor="middle" font-size="14" font-weight="800" fill="${hot ? '#b3261e' : '#2b2418'}">${h.num}</text>${d}`;
}
function stockBubble(x, y, s, color) {
  const rs = RES.filter(r => s[r]); if (!rs.length) return ''; const w = rs.length * 27 + 6;
  return `<rect x="${f1(x - w / 2)}" y="${f1(y)}" width="${w}" height="19" rx="5" fill="#0d1a22" fill-opacity=".93" stroke="${color}" stroke-width="1.4"/>` + rs.map((r, i) => `<g transform="translate(${f1(x - w / 2 + 5 + i * 27)},${f1(y + 3.5)}) scale(.75)">${ICON[r]}</g><text x="${f1(x - w / 2 + 18 + i * 27)}" y="${f1(y + 13.5)}" font-size="10.5" font-weight="800" fill="#fff">${s[r]}</text>`).join('');
}

function drawBoard() {
  if (!G.static) initBoard();
  const hl = G.hl, sel = G.sel; let o = '', hi = '', hits = '', defs = '';
  // territory: tinted ground with a continuous border around each realm
  G.P.forEach(P => {
    const hs = myHexes(P.id); if (!hs.length) return;
    defs += `<clipPath id="terr${P.id}">${hs.map(h => `<polygon points="${hexPts(h.x, h.y, S)}"/>`).join('')}</clipPath>`;
    let fill = '', lines = '';
    hs.forEach(h => { fill += `<polygon points="${hexPts(h.x, h.y, S)}"/>`; for (let i = 0; i < 6; i++) { const nb = h.nb[i]; if (nb >= 0 && H(nb).owner === P.id) continue; const a = corner(h.x, h.y, i), b = corner(h.x, h.y, (i + 1) % 6); lines += `M${f1(a[0])},${f1(a[1])} L${f1(b[0])},${f1(b[1])} ` } });
    o += `<g fill="${P.color}" opacity="${P.barb ? .2 : .13}">${fill}</g><g clip-path="url(#terr${P.id})" fill="none" stroke-linecap="round"><path d="${lines}" stroke="${P.color}" stroke-width="26" opacity=".22"/><path d="${lines}" stroke="${P.dark}" stroke-width="12" opacity=".8"/><path d="${lines}" stroke="${P.color}" stroke-width="8"/></g>`;
  });
  G.edges.forEach(e => { if (e.road) o += roadArt(e) });
  if (G.stores) { // supply lines of the viewer
    const me = G.P[0], zm = zoneMap(0);
    zm.forEach((vid, hid) => { const h = H(hid); hi += `<polygon points="${hexPts(h.x, h.y, S - 7)}" fill="${me.color}" fill-opacity=".1" stroke="#fff" stroke-width="1.6" stroke-dasharray="3 5" opacity=".9"/>`; if (h.owner === 0) { const v = V(vid); hi += `<line x1="${f1(h.x)}" y1="${f1(h.y + 30)}" x2="${f1(v.x)}" y2="${f1(v.y)}" stroke="#fff" stroke-width="1.6" stroke-dasharray="2 4" opacity=".8"/>` } });
  }
  G.hexes.forEach(h => {
    if (hl.move.has(h.id)) hi += `<polygon points="${hexPts(h.x, h.y, S - 4)}" fill="#8fdcff" fill-opacity=".18" stroke="#d6f3ff" stroke-width="2.5" stroke-dasharray="7 5"/>`;
    if (hl.atk.has(h.id)) hi += `<polygon class="pulse" points="${hexPts(h.x, h.y, S - 4)}" fill="#ff3b2f" fill-opacity=".25" stroke="#ff5a4d" stroke-width="4.5"/>`;
    if (hl.gold.has(h.id)) hi += `<polygon class="pulse" points="${hexPts(h.x, h.y, S - 4)}" fill="#ffd166" fill-opacity=".25" stroke="#ffd166" stroke-width="4"/>`;
    if (hl.conv.some(c => c.k === 'c' && c.id === h.id)) hi += `<polygon class="pulse" points="${hexPts(h.x, h.y, S - 4)}" fill="#59e08a" fill-opacity=".22" stroke="#59e08a" stroke-width="4"/>`;
    if (sel && sel.k === 'c' && sel.id === h.id) hi += `<polygon points="${hexPts(h.x, h.y, S - 3)}" fill="none" stroke="#fff" stroke-width="4"/>`;
    if (G.flash && G.flash.k === 'h' && G.flash.id === h.id) hi += `<polygon points="${hexPts(h.x, h.y, S - 3)}" fill="#ff2a1f" fill-opacity=".35" stroke="#ff2a1f" stroke-width="5"/>`;
  });
  o += hi; G.hexes.forEach(h => o += tokenArt(h));
  G.hexes.forEach(h => { if (h.owner >= 0 && h.armies > 0) o += armyArt(h); else if (h.owner === -1 && stotal(h.stock)) o += cacheArt(h) });
  [...G.verts].filter(v => v.town).sort((a, b) => a.y - b.y).forEach(v => {
    if (sel && sel.k === 't' && sel.id === v.id) o += `<circle cx="${f1(v.x)}" cy="${f1(v.y + 4)}" r="41" fill="#fff" fill-opacity=".14" stroke="#fff" stroke-width="3"/>`;
    if (hl.siege.has(v.id) || (G.flash && G.flash.k === 't' && G.flash.id === v.id)) o += `<circle class="pulse" cx="${f1(v.x)}" cy="${f1(v.y + 4)}" r="41" fill="#ff3b2f" fill-opacity=".25" stroke="#ff5a4d" stroke-width="4.5"/>`;
    if (hl.conv.some(c => c.k === 't' && c.id === v.id)) o += `<circle class="pulse" cx="${f1(v.x)}" cy="${f1(v.y + 4)}" r="41" fill="#59e08a" fill-opacity=".22" stroke="#59e08a" stroke-width="4"/>`;
    o += townArt(v);
  });
  if (G.stores) stockpiles(0).forEach((sp, i) => { const s = sp.stock, hd = sp.hd; if (hd.k === 't') { const v = V(hd.id); o += stockBubble(v.x, v.y - 60 - (i % 2) * 21, s, G.P[0].color) } else { const h = H(hd.id); o += stockBubble(h.x, h.y - 52, s, G.P[0].color) } });
  if (G.fx && !G.stores && Date.now() - G.fx.t < 1700) { const dt = Date.now() - G.fx.t; G.fx.items.forEach(f => o += `<g class="fx" style="animation-delay:-${dt}ms"><rect x="${f1(f.x - 19)}" y="${f1(f.y - 11)}" width="38" height="18" rx="9" fill="#0d1a22" fill-opacity=".9" stroke="${f.c}" stroke-width="1.5"/><text x="${f1(f.x - 12)}" y="${f1(f.y + 2.5)}" font-size="11" font-weight="800" fill="#fff">+${f.n}</text><g transform="translate(${f1(f.x + 3)},${f1(f.y - 8)}) scale(.75)">${ICON[f.r]}</g></g>`) }
  G.hexes.forEach(h => {
    const own = h.owner >= 0 ? G.P[h.owner].name : 'unclaimed', c = h.owner === -1 && stotal(h.stock) ? ` · ${stotal(h.stock)} resources lying here` : '';
    hits += `<polygon class="hit" points="${hexPts(h.x, h.y, S - 1)}" onclick="onHex(${h.id},event)"><title>${hexName(h)} · ${own}${h.armies ? ' · ' + h.armies + ' soldiers' : ''}${c}</title></polygon>`;
  });
  G.verts.forEach(v => { if (v.town) hits += `<circle class="hit" cx="${f1(v.x)}" cy="${f1(v.y + 3)}" r="27" onclick="onTown(${v.id})"><title>${v.town.name} · ${G.P[v.town.owner].name} · size ${v.town.pop}</title></circle>` });
  hl.edges.forEach(id => { const e = E(id), a = V(e.v[0]), b = V(e.v[1]); hits += `<line class="hit cand pulse" x1="${f1(a.x)}" y1="${f1(a.y)}" x2="${f1(b.x)}" y2="${f1(b.y)}" stroke="#ffd166" stroke-width="10" stroke-linecap="round" onclick="onEdge(${id})"><title>Build a road here</title></line>` });
  hl.verts.forEach(id => { const v = V(id); hits += `<circle class="hit cand pulse" cx="${f1(v.x)}" cy="${f1(v.y)}" r="12" fill="#ffd166" stroke="#fff" stroke-width="2.5" onclick="onVertex(${id})"><title>Settle here</title></circle>` });
  document.getElementById('dyn').innerHTML = `<defs>${defs}</defs>` + o; document.getElementById('hits').innerHTML = hits;
}
