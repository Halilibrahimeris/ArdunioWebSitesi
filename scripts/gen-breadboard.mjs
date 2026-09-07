/**
 * Breadboard şeması üretici / Breadboard diagram generator
 *
 * Tinkercad'deki gibi resimli bağlantı şemaları üretir: gerçek breadboard,
 * numaralı sütunlar, harfli satırlar ve her kablonun tam olarak hangi deliğe
 * girdiği.
 *
 * Çalıştırma:  node scripts/gen-breadboard.mjs
 *
 * SVG içinde YALNIZCA dilden bağımsız metin bulunur (D2, GND, 220Ω, sütun
 * numaraları). Açıklamalar MDX tarafında, iki dilde yazılır.
 *
 * Delik adresleri:
 *   a1..a30 ... j1..j30   ana alan (a-e alt blok, f-j üst blok)
 *   M1..M30               alt eksi (−) hattı, alt bloğa komşu
 *   P1..P30               alt artı (+) hattı, en altta
 *   m1..m30               üst eksi (−) hattı, en üstte
 *   p1..p30               üst artı (+) hattı, üst bloğa komşu
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(HERE, '..', 'src', 'diagrams');

// ───────────────────────── Ölçüler ─────────────────────────
const P = 15;              // Delikler arası mesafe
const COLS = 30;
const BX = 262;            // Breadboard sol kenarı
const BY = 44;             // Breadboard üst kenarı

const ROWS_TOP = ['j', 'i', 'h', 'g', 'f'];
const ROWS_BOT = ['e', 'd', 'c', 'b', 'a'];

// Dikey yerleşim (yukarıdan aşağı)
const Y_TOP_MINUS = BY + 15;
const Y_TOP_PLUS  = Y_TOP_MINUS + P;
const Y_BLOCK_TOP = Y_TOP_PLUS + P * 2.1;              // satır j
const Y_CHANNEL   = Y_BLOCK_TOP + P * 4 + P * 0.9;
const Y_BLOCK_BOT = Y_BLOCK_TOP + P * 4 + P * 1.8;     // satır e
const Y_BOT_MINUS = Y_BLOCK_BOT + P * 4 + P * 2.1;
const Y_BOT_PLUS  = Y_BOT_MINUS + P;

const BOARD_W = (COLS - 1) * P + P * 2;
const BOARD_H = Y_BOT_PLUS + P * 1.1 - BY;

const RAIL_Y = { m: Y_TOP_MINUS, p: Y_TOP_PLUS, M: Y_BOT_MINUS, P: Y_BOT_PLUS };

function hole(addr) {
  const m = /^([a-jMPmp])(\d+)$/.exec(addr);
  if (!m) throw new Error(`Gecersiz delik adresi: ${addr}`);
  const [, row, colStr] = m;
  const col = Number(colStr);
  if (col < 1 || col > COLS) throw new Error(`Sutun aralik disi: ${addr}`);

  const x = BX + P * 0.5 + (col - 1) * P;

  if (row in RAIL_Y) return { x, y: RAIL_Y[row] };

  const ti = ROWS_TOP.indexOf(row);
  if (ti >= 0) return { x, y: Y_BLOCK_TOP + ti * P };

  const bi = ROWS_BOT.indexOf(row);
  if (bi >= 0) return { x, y: Y_BLOCK_BOT + bi * P };

  throw new Error(`Bilinmeyen satir: ${addr}`);
}

// ───────────────────────── Breadboard gövdesi ─────────────────────────

function breadboardBase({ columnNumbers = true } = {}) {
  const parts = [
    `<rect class="bb" x="${BX}" y="${BY}" width="${BOARD_W}" height="${BOARD_H}" rx="6" />`,
  ];

  const rx1 = BX + P * 0.35;
  const rx2 = BX + BOARD_W - P * 0.35;

  // Güç hattı çizgileri ve uç etiketleri
  const rails = [
    ['m', Y_TOP_MINUS, -10, 'minus', '−'],
    ['p', Y_TOP_PLUS, 10, 'plus', '+'],
    ['M', Y_BOT_MINUS, -10, 'minus', '−'],
    ['P', Y_BOT_PLUS, 10, 'plus', '+'],
  ];

  for (const [, y, off, cls, sym] of rails) {
    parts.push(
      `<line class="rail-${cls}" x1="${rx1}" y1="${y + off}" x2="${rx2}" y2="${y + off}" />`,
      `<text class="rail-lbl ${cls}" x="${BX - 9}" y="${y + 4}" text-anchor="end">${sym}</text>`,
      `<text class="rail-lbl ${cls}" x="${BX + BOARD_W + 9}" y="${y + 4}">${sym}</text>`
    );
  }

  // Orta kanal
  parts.push(
    `<rect class="channel" x="${BX + P * 0.35}" y="${Y_CHANNEL - P * 0.55}" width="${BOARD_W - P * 0.7}" height="${P * 1.1}" rx="2" />`
  );

  // Delikler
  for (let col = 1; col <= COLS; col++) {
    for (const row of ['m', 'p', 'M', 'P']) {
      if (col % 6 === 0) continue;         // gerçek breadboard'daki 5'li gruplar
      const { x, y } = hole(`${row}${col}`);
      parts.push(`<circle class="hole" cx="${x}" cy="${y}" r="2.3" />`);
    }
    for (const row of [...ROWS_TOP, ...ROWS_BOT]) {
      const { x, y } = hole(`${row}${col}`);
      parts.push(`<circle class="hole" cx="${x}" cy="${y}" r="2.3" />`);
    }

    if (columnNumbers && (col === 1 || col % 5 === 0)) {
      const { x } = hole(`a${col}`);
      parts.push(
        `<text class="col-num" x="${x}" y="${Y_BLOCK_TOP - P * 0.85}" text-anchor="middle">${col}</text>`,
        `<text class="col-num" x="${x}" y="${Y_CHANNEL + 4}" text-anchor="middle">${col}</text>`
      );
    }
  }

  // Satır harfleri
  for (const [i, row] of ROWS_TOP.entries()) {
    const y = Y_BLOCK_TOP + i * P + 3.5;
    parts.push(
      `<text class="row-lbl" x="${BX - 9}" y="${y}" text-anchor="end">${row}</text>`,
      `<text class="row-lbl" x="${BX + BOARD_W + 9}" y="${y}">${row}</text>`
    );
  }
  for (const [i, row] of ROWS_BOT.entries()) {
    const y = Y_BLOCK_BOT + i * P + 3.5;
    parts.push(
      `<text class="row-lbl" x="${BX - 9}" y="${y}" text-anchor="end">${row}</text>`,
      `<text class="row-lbl" x="${BX + BOARD_W + 9}" y="${y}">${row}</text>`
    );
  }

  return parts.join('\n  ');
}

// ───────────────────────── Bileşenler ─────────────────────────

function wire(from, to, colour, bow = 0) {
  const a = typeof from === 'string' ? hole(from) : from;
  const b = typeof to === 'string' ? hole(to) : to;
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2 - bow;

  return [
    `<path class="w" stroke="${colour}" d="M${a.x} ${a.y} Q${mx} ${my} ${b.x} ${b.y}" />`,
    `<circle fill="${colour}" stroke="rgba(0,0,0,.3)" stroke-width="1" cx="${a.x}" cy="${a.y}" r="3.3" />`,
    `<circle fill="${colour}" stroke="rgba(0,0,0,.3)" stroke-width="1" cx="${b.x}" cy="${b.y}" r="3.3" />`,
  ].join('\n  ');
}

/**
 * LED — üstten görünüm. Gövde iki deliğin tam ortasında oturur,
 * uzun bacağın (anot) üstüne + işareti konur.
 */
function led(anode, cathode, colour) {
  const a = hole(anode);
  const c = hole(cathode);
  const cx = (a.x + c.x) / 2;
  const cy = (a.y + c.y) / 2;

  return [
    `<circle class="led-halo" cx="${cx}" cy="${cy}" r="11" />`,
    `<circle class="led-body" fill="${colour}" cx="${cx}" cy="${cy}" r="8.5" />`,
    `<circle class="led-shine" cx="${cx - 2.8}" cy="${cy - 2.8}" r="2.4" />`,
    `<text class="plus-mark" x="${a.x}" y="${a.y - 13}" text-anchor="middle">+</text>`,
  ].join('\n  ');
}

/** Direnç — iki delik arasında yatay/dikey durur, etiketi dışa yazılır. */
function resistor(from, to, label, labelSide = 'above') {
  const a = hole(from);
  const b = hole(to);
  const cx = (a.x + b.x) / 2;
  const cy = (a.y + b.y) / 2;
  const angle = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;

  const dikey = Math.abs(b.y - a.y) > Math.abs(b.x - a.x);
  const lx = dikey ? cx + 26 : cx;
  const ly = dikey ? cy + 4 : cy - (labelSide === 'above' ? 13 : -18);

  return [
    `<path class="leg" d="M${a.x} ${a.y} L${b.x} ${b.y}" />`,
    `<g transform="translate(${cx} ${cy}) rotate(${angle})">`,
    `  <rect class="res-body" x="-14" y="-5" width="28" height="10" rx="4" />`,
    `  <rect x="-8.5" y="-5" width="2.6" height="10" fill="#8a5a2b" />`,
    `  <rect x="-3"   y="-5" width="2.6" height="10" fill="#1a1a1a" />`,
    `  <rect x="2.5"  y="-5" width="2.6" height="10" fill="#c8102e" />`,
    `</g>`,
    `<text class="comp-lbl" x="${lx}" y="${ly}" text-anchor="middle">${label}</text>`,
  ].join('\n  ');
}

/** Buton — orta kanalı atlar, dört bacağı f ve e satırlarına oturur. */
function button(colLeft, colRight) {
  const tl = hole(`f${colLeft}`);
  const tr = hole(`f${colRight}`);
  const bl = hole(`e${colLeft}`);

  const x = tl.x - 7;
  const y = tl.y - 7;
  const w = tr.x - tl.x + 14;
  const h = bl.y - tl.y + 14;

  return [
    `<rect class="btn-body" x="${x}" y="${y}" width="${w}" height="${h}" rx="3" />`,
    `<circle class="btn-cap" cx="${(tl.x + tr.x) / 2}" cy="${(tl.y + bl.y) / 2}" r="9" />`,
    ...[`f${colLeft}`, `f${colRight}`, `e${colLeft}`, `e${colRight}`].map((h2) => {
      const p = hole(h2);
      return `<circle class="btn-leg" cx="${p.x}" cy="${p.y}" r="3" />`;
    }),
  ].join('\n  ');
}

/** Arduino kartı — sağ kenarında yalnızca kullandığımız pinler. */
function arduino(pins, { x = 18, y = 78, w = 206, h = 240 } = {}) {
  const parts = [
    `<rect class="ard" x="${x}" y="${y}" width="${w}" height="${h}" rx="10" />`,
    `<text class="ard-title" x="${x + w / 2}" y="${y + 32}" text-anchor="middle">Arduino UNO Q</text>`,
    `<text class="ard-sub" x="${x + w / 2}" y="${y + 50}" text-anchor="middle">3.3V</text>`,
    `<rect class="ard-chip" x="${x + 40}" y="${y + 70}" width="58" height="44" rx="4" />`,
    `<rect class="ard-chip" x="${x + 110}" y="${y + 70}" width="54" height="44" rx="4" />`,
  ];

  for (const [name, py] of Object.entries(pins)) {
    parts.push(
      `<circle class="ard-pad" cx="${x + w}" cy="${py}" r="4.5" />`,
      `<text class="pin" x="${x + w - 13}" y="${py + 4}" text-anchor="end">${name}</text>`
    );
  }
  return { svg: parts.join('\n  '), edgeX: x + w };
}

// ───────────────────────── SVG iskeleti ─────────────────────────

const STYLE = `
  .bb         { fill: #e9ebed; stroke: #c2c8cc; stroke-width: 1.5; }
  .channel    { fill: #d2d7db; }
  .hole       { fill: #98a2a8; }
  .rail-plus  { stroke: #d94a3d; stroke-width: 2; }
  .rail-minus { stroke: #3f7fd0; stroke-width: 2; }
  .rail-lbl   { font-family: ui-sans-serif, system-ui, sans-serif; font-size: 13px; font-weight: 700; }
  .rail-lbl.plus  { fill: #d94a3d; }
  .rail-lbl.minus { fill: #3f7fd0; }
  .col-num    { font-family: ui-monospace, monospace; font-size: 9.5px; fill: #6f7d83; }
  .row-lbl    { font-family: ui-monospace, monospace; font-size: 10px; font-weight: 700; fill: #6f7d83; }

  .ard        { fill: #0f7a80; stroke: #0a5a5f; stroke-width: 2; }
  .ard-title  { font-family: ui-sans-serif, system-ui, sans-serif; font-size: 14px; font-weight: 700; fill: #eafafa; }
  .ard-sub    { font-family: ui-sans-serif, system-ui, sans-serif; font-size: 11px; fill: #a9dfe2; }
  .ard-chip   { fill: #0a5a5f; }
  .ard-pad    { fill: #f5c542; stroke: #a8862a; stroke-width: 1.2; }
  .pin        { font-family: ui-monospace, monospace; font-size: 11px; font-weight: 700; fill: #eafafa; }

  .w          { fill: none; stroke-width: 3.4; stroke-linecap: round; }
  .leg        { fill: none; stroke: #8d949a; stroke-width: 2; stroke-linecap: round; }
  .res-body   { fill: #dccfa8; stroke: #a89876; stroke-width: 1; }
  .led-halo   { fill: rgba(255,255,255,.75); }
  .led-body   { stroke: rgba(0,0,0,.35); stroke-width: 1; }
  .led-shine  { fill: rgba(255,255,255,.7); }
  .btn-body   { fill: #4a5157; stroke: #2e3438; stroke-width: 1.5; }
  .btn-cap    { fill: #bcc3c8; stroke: #7d868c; stroke-width: 1.2; }
  .btn-leg    { fill: #c9a227; }

  .comp-lbl   { font-family: ui-sans-serif, system-ui, sans-serif; font-size: 11px; font-weight: 700; fill: var(--text, #102b2e); }
  .plus-mark  { font-family: ui-sans-serif, system-ui, sans-serif; font-size: 13px; font-weight: 700; fill: var(--text, #102b2e); }
  .legend     { font-family: ui-sans-serif, system-ui, sans-serif; font-size: 11px; fill: var(--text-muted, #5a6f74); }
  .note       { font-family: ui-sans-serif, system-ui, sans-serif; font-size: 11.5px; font-weight: 700; fill: var(--text, #102b2e); }
  .badge      { fill: #00979d; }
  .badge-txt  { font-family: ui-sans-serif, system-ui, sans-serif; font-size: 11px; font-weight: 700; fill: #fff; }
`;

function svg({ title, width, height, body }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${title}">
  <title>${title}</title>
  <style>${STYLE}</style>
  ${body}
</svg>
`;
}

function write(name, content) {
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, name), content, 'utf8');
  console.log('yazildi:', name, `(${content.length} bayt)`);
}

function badge(n, x, y) {
  return `<circle class="badge" cx="${x}" cy="${y}" r="9" /><text class="badge-txt" x="${x}" y="${y + 4}" text-anchor="middle">${n}</text>`;
}

// ═══════════════════ Proje 1 — Trafik Lambası ═══════════════════
//
// Her LED kendi sütun bandında, hepsi aynı kalıpta:
//   Arduino pini → b(N)      · sinyal kablosu
//   a(N) → a(N+2)            · 220Ω direnç
//   b(N+2) / b(N+3)          · LED (uzun bacak solda)
//   a(N+3) → M(N+3)          · katottan eksi hattına jumper
//
// Buton orta kanalı atlar; 3V3 ve D7 iki yanına, 10kΩ pull-down eksi hattına.

const PINS_P1 = { D2: 140, D3: 168, D4: 196, D7: 240, '3V3': 272, GND: 302 };
const ard1 = arduino(PINS_P1);
const EX = ard1.edgeX;

/**
 * Bir LED şeridi. Üç LED de aynı kalıbı izler, yalnızca sütun kayar:
 *   Arduino pini → d(n)          sinyal kablosu
 *   c(n) → c(n+2)                220Ω direnç
 *   a(n+2) / a(n+3)              LED (uzun bacak solda)
 *   b(n+3) → M(n+3)              katottan eksi hattına jumper
 * Satırları ayırmak, direnç etiketinin LED gövdesine binmesini önler.
 */
function ledLane(startCol, colour, pinY) {
  const n = startCol;
  return [
    wire({ x: EX, y: pinY }, `d${n}`, '#0d8ce0', 0),
    resistor(`c${n}`, `c${n + 2}`, '220Ω'),
    led(`a${n + 2}`, `a${n + 3}`, colour),
    wire(`b${n + 3}`, `M${n + 3}`, '#3a3f44', 0),
  ].join('\n  ');
}

const body1 = [
  breadboardBase(),
  ard1.svg,

  // GND → alt eksi hattı
  wire({ x: EX, y: 302 }, 'M2', '#3a3f44', 10),

  // Buton solda: alttaki pinler en yakın sütunlara gider, böylece
  // yukarıdaki LED kabloları hiçbirini kesmez.
  button(3, 5),
  wire({ x: EX, y: 240 }, 'c3', '#0d8ce0', 0),       // D7 → butonun sol sütunu
  wire({ x: EX, y: 272 }, 'a5', '#d94a3d', 0),       // 3V3 → butonun sağ sütunu
  resistor('b3', 'M3', '10kΩ'),

  // LED şeritleri sağda, yukarıdaki pinler soldan sağa sırayla
  ledLane(9, '#e02020', 140),
  ledLane(15, '#e0b020', 168),
  ledLane(21, '#20b050', 196),

  // Numara rozetleri
  badge(1, hole('d9').x - 20, hole('d9').y),
  badge(2, hole('c10').x, hole('c10').y - 30),
  badge(3, hole('a11').x - 22, hole('a11').y + 4),
  badge(4, hole('f4').x, hole('f4').y - 26),

  `<g transform="translate(18, ${Y_BOT_PLUS + 46})">
    <line class="w" stroke="#d94a3d" x1="0" y1="0" x2="26" y2="0" />
    <text class="legend" x="34" y="4">3V3</text>
    <line class="w" stroke="#0d8ce0" x1="82" y1="0" x2="108" y2="0" />
    <text class="legend" x="116" y="4">D2 · D3 · D4 · D7</text>
    <line class="w" stroke="#3a3f44" x1="242" y1="0" x2="268" y2="0" />
    <text class="legend" x="276" y="4">GND</text>
    <text class="legend" x="352" y="4">+ = LED uzun bacak / long leg</text>
  </g>`,
].join('\n  ');

write('01-traffic-light-breadboard.svg', svg({
  title: 'Trafik lambasi breadboard yerlesimi / Traffic light breadboard layout',
  width: 800,
  height: Y_BOT_PLUS + 70,
  body: body1,
}));

// ═══════════════ Rehber — Breadboard iç bağlantıları ═══════════════

const groups = [];

for (const col of [5, 11, 17]) {
  const t = hole(`j${col}`), b = hole(`f${col}`);
  groups.push(`<rect class="grp-col" x="${t.x - 6.5}" y="${t.y - 6.5}" width="13" height="${b.y - t.y + 13}" rx="6.5" />`);
}
for (const col of [5, 11, 17]) {
  const t = hole(`e${col}`), b = hole(`a${col}`);
  groups.push(`<rect class="grp-col" x="${t.x - 6.5}" y="${t.y - 6.5}" width="13" height="${b.y - t.y + 13}" rx="6.5" />`);
}

for (const [row, cls] of [['m', 'minus'], ['p', 'plus'], ['M', 'minus'], ['P', 'plus']]) {
  const a = hole(`${row}1`), b = hole(`${row}29`);
  groups.push(`<rect class="grp-rail ${cls}" x="${a.x - 7}" y="${a.y - 7}" width="${b.x - a.x + 14}" height="14" rx="7" />`);
}

const bodyBB = [
  `<style>
    .grp-col        { fill: rgba(0,151,157,.22); stroke: #00979d; stroke-width: 1.7; }
    .grp-rail       { fill: rgba(217,74,61,.14); stroke: #d94a3d; stroke-width: 1.7; }
    .grp-rail.minus { fill: rgba(63,127,208,.14); stroke: #3f7fd0; }
  </style>`,
  breadboardBase(),
  groups.join('\n  '),

  badge(1, hole('j5').x - 30, hole('h5').y),
  badge(2, hole('m1').x - 30, hole('m1').y),
  badge(3, hole('f14').x, Y_CHANNEL + 26),

  `<g transform="translate(${BX}, ${Y_BOT_PLUS + 46})">
    <rect x="0" y="-9" width="14" height="14" rx="7" fill="rgba(0,151,157,.22)" stroke="#00979d" stroke-width="1.5" />
    <text class="legend" x="22" y="3">5 delik dikey bağlı / 5 holes connected vertically</text>
    <rect x="330" y="-9" width="14" height="14" rx="7" fill="rgba(217,74,61,.14)" stroke="#d94a3d" stroke-width="1.5" />
    <text class="legend" x="352" y="3">güç hattı boyunca bağlı / whole rail connected</text>
  </g>`,
].join('\n  ');

write('breadboard-baglantilar.svg', svg({
  title: 'Breadboard ic baglantilari / How a breadboard is connected inside',
  width: 800,
  height: Y_BOT_PLUS + 70,
  body: bodyBB,
}));
