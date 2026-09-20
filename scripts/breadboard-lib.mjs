/**
 * Breadboard şema kütüphanesi / Breadboard diagram library
 *
 * gen-breadboard.mjs bu dosyadaki parçaları birleştirerek her projenin
 * şemasını üretir. Buradaki her fonksiyon yalnızca SVG parçası döndürür.
 *
 * Tasarım kuralları (hiç bilgisi olmayan biri de okuyabilsin diye):
 *   - Kablolar birbirini KESMEZ. Kablolar ya orta kanaldan ya tahtanın
 *     üstünden/altından dolanır, her biri kendi şeridinde ilerler ve hedef
 *     sütuna dik iner.
 *   - Her kablo farklı renktedir ve üzerinde/ucunda hangi pin olduğu yazar.
 *   - Her parçanın adı yanında yazar; direnç bantları gerçek değere uyar.
 *   - Tahta üzerindeki yazılar sabit koyu renktir (tahta her temada açık renk),
 *     tahta dışındakiler sayfa temasına uyar.
 *
 * Delik adresleri:
 *   a1..a30 ... j1..j30   ana alan (a-e alt blok, f-j üst blok)
 *   M1..M30               alt eksi (−) hattı, alt bloğa komşu
 *   P1..P30               alt artı (+) hattı, en altta
 *   m1..m30               üst eksi (−) hattı, en üstte
 *   p1..p30               üst artı (+) hattı, üst bloğa komşu
 *   Güç hatlarında 6, 12, 18, 24 ve 30. sütunlarda delik YOKTUR (5'li gruplar).
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
export const OUT_DIR = join(HERE, '..', 'src', 'diagrams');

// ───────────────────────── Ölçüler ─────────────────────────
export const P = 18;              // Delikler arası mesafe
export const COLS = 30;
export const BX = 262;            // Breadboard sol kenarı
export const BY = 44;             // Breadboard üst kenarı
export const WIDTH = 870;         // Tüm şemaların genişliği

const ROWS_TOP = ['j', 'i', 'h', 'g', 'f'];
const ROWS_BOT = ['e', 'd', 'c', 'b', 'a'];

// Dikey yerleşim (yukarıdan aşağı). Gerçek breadboard'da f ile e arası 3 adımdır.
export const Y_TOP_MINUS = BY + 16;
export const Y_TOP_PLUS  = Y_TOP_MINUS + P;
export const Y_BLOCK_TOP = Y_TOP_PLUS + P * 2.1;              // satır j
export const Y_BLOCK_BOT = Y_BLOCK_TOP + P * 4 + P * 3;       // satır e
export const Y_CHANNEL   = Y_BLOCK_TOP + P * 4 + P * 1.5;     // kanalın merkezi
export const Y_BOT_MINUS = Y_BLOCK_BOT + P * 4 + P * 2.1;
export const Y_BOT_PLUS  = Y_BOT_MINUS + P;

export const BOARD_W = (COLS - 1) * P + P * 2;
export const BOARD_H = Y_BOT_PLUS + P * 1.1 - BY;
export const BOARD_BOTTOM = BY + BOARD_H;
export const CHANNEL_H = P * 2.2;

/** Tahtanın üstünden dolanan kabloların çizgisi. */
export const TOP_ROUTE_Y = 26;
/** Tahtanın altından dolanan kabloların şeritleri (0, 1, 2...). */
export const bottomLane = (i) => BOARD_BOTTOM + 13 + i * 8;

const RAIL_Y = { m: Y_TOP_MINUS, p: Y_TOP_PLUS, M: Y_BOT_MINUS, P: Y_BOT_PLUS };

export function hole(addr) {
  const m = /^([a-jMPmp])(\d+)$/.exec(addr);
  if (!m) throw new Error(`Gecersiz delik adresi: ${addr}`);
  const [, row, colStr] = m;
  const col = Number(colStr);
  if (col < 1 || col > COLS) throw new Error(`Sutun aralik disi: ${addr}`);
  if (row in RAIL_Y && col % 6 === 0) throw new Error(`Guc hattinda delik yok: ${addr}`);

  const x = BX + P * 0.5 + (col - 1) * P;

  if (row in RAIL_Y) return { x, y: RAIL_Y[row] };

  const ti = ROWS_TOP.indexOf(row);
  if (ti >= 0) return { x, y: Y_BLOCK_TOP + ti * P };

  const bi = ROWS_BOT.indexOf(row);
  if (bi >= 0) return { x, y: Y_BLOCK_BOT + bi * P };

  throw new Error(`Bilinmeyen satir: ${addr}`);
}

export const pt = (p) => (typeof p === 'string' ? hole(p) : p);

// ───────────────────────── Breadboard gövdesi ─────────────────────────

export function breadboardBase({ columnNumbers = true, leftRailLabels = true, railNames = {} } = {}) {
  const parts = [
    `<rect class="bb" x="${BX}" y="${BY}" width="${BOARD_W}" height="${BOARD_H}" rx="6" />`,
  ];

  const rx1 = BX + P * 0.35;
  const rx2 = BX + BOARD_W - P * 0.35;

  const rails = [
    ['m', Y_TOP_MINUS, -10, 'minus', '−'],
    ['p', Y_TOP_PLUS, 10, 'plus', '+'],
    ['M', Y_BOT_MINUS, -10, 'minus', '−'],
    ['P', Y_BOT_PLUS, 10, 'plus', '+'],
  ];

  for (const [key, y, off, cls, sym] of rails) {
    parts.push(`<line class="rail-${cls}" x1="${rx1}" y1="${y + off}" x2="${rx2}" y2="${y + off}" />`);
    if (leftRailLabels) {
      parts.push(`<text class="rail-lbl ${cls}" x="${BX - 9}" y="${y + 4}" text-anchor="end">${sym}</text>`);
    }
    parts.push(`<text class="rail-lbl ${cls}" x="${BX + BOARD_W + 9}" y="${y + 4}">${sym}</text>`);
    if (railNames[key]) {
      parts.push(`<text class="rail-name ${cls}" x="${BX + BOARD_W + 21}" y="${y + 4}">${railNames[key]}</text>`);
    }
  }

  parts.push(
    `<rect class="channel" x="${BX + P * 0.35}" y="${Y_CHANNEL - CHANNEL_H / 2}" width="${BOARD_W - P * 0.7}" height="${CHANNEL_H}" rx="3" />`
  );

  for (let col = 1; col <= COLS; col++) {
    for (const row of ['m', 'p', 'M', 'P']) {
      if (col % 6 === 0) continue;         // gerçek breadboard'daki 5'li gruplar
      const { x, y } = hole(`${row}${col}`);
      parts.push(`<circle class="hole" cx="${x}" cy="${y}" r="2.6" />`);
    }
    for (const row of [...ROWS_TOP, ...ROWS_BOT]) {
      const { x, y } = hole(`${row}${col}`);
      parts.push(`<circle class="hole" cx="${x}" cy="${y}" r="2.6" />`);
    }

    if (columnNumbers && (col === 1 || col % 5 === 0)) {
      const { x } = hole(`a${col}`);
      parts.push(
        `<text class="col-num" x="${x}" y="${Y_BLOCK_TOP - P * 0.85}" text-anchor="middle">${col}</text>`,
        `<text class="col-num" x="${x}" y="${Y_BLOCK_BOT + P * 4 + P * 1.05 + 3}" text-anchor="middle">${col}</text>`
      );
    }
  }

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

// ───────────────────────── Kablolar ─────────────────────────

/** Köşeleri yuvarlatılmış kırık çizgi. Kısa parçalarda yarıçap otomatik küçülür. */
export function roundedPath(points, R = 9) {
  const pts = points.map(pt);
  if (pts.length < 2) throw new Error('En az iki nokta gerekir');
  const seg = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);
  let d = `M${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const prev = pts[i - 1], cur = pts[i], next = pts[i + 1];
    const r = Math.min(R, seg(prev, cur) / 2, seg(cur, next) / 2);
    const inX = cur.x + ((prev.x - cur.x) / seg(prev, cur)) * r;
    const inY = cur.y + ((prev.y - cur.y) / seg(prev, cur)) * r;
    const outX = cur.x + ((next.x - cur.x) / seg(cur, next)) * r;
    const outY = cur.y + ((next.y - cur.y) / seg(cur, next)) * r;
    d += ` L${inX} ${inY} Q${cur.x} ${cur.y} ${outX} ${outY}`;
  }
  const last = pts[pts.length - 1];
  d += ` L${last.x} ${last.y}`;
  return d;
}

/** Kablo: noktalar dizisi (delik adresi veya {x,y}), iki ucu noktalı. */
export function wire(points, colour) {
  const pts = points.map(pt);
  const a = pts[0], b = pts[pts.length - 1];
  return [
    `<path class="w" stroke="${colour}" d="${roundedPath(points)}" />`,
    `<circle class="w-end" fill="${colour}" cx="${a.x}" cy="${a.y}" r="3.6" />`,
    `<circle class="w-end" fill="${colour}" cx="${b.x}" cy="${b.y}" r="3.6" />`,
  ].join('\n  ');
}

/**
 * Kart pininden hedefe giden standart yol:
 *   pin → sağa (trunkX) → dik (laneY) → yatay (hedef sütunu) → hedef delik.
 * Kanal şeritleri, tahta üstü ve tahta altı yollarının hepsi bu şekli kullanır.
 */
export function route(edgeX, pinY, trunkX, laneY, target, colour) {
  const t = pt(target);
  return wire([{ x: edgeX, y: pinY }, { x: trunkX, y: pinY }, { x: trunkX, y: laneY }, { x: t.x, y: laneY }, t], colour);
}

/** Kablo üzerindeki ya da ucundaki pin etiketi (renkli hap). */
export function tag(x, y, text, colour) {
  const w = text.length * 7 + 10;
  return [
    `<rect class="tag" fill="${colour}" x="${x - w / 2}" y="${y - 8}" width="${w}" height="16" rx="4" />`,
    `<text class="tag-txt" x="${x}" y="${y + 3.6}" text-anchor="middle">${text}</text>`,
  ].join('\n  ');
}

/** Tahta üzerindeki parça adı — açık konturla delikler üstünde okunur kalır. */
export function label(x, y, text, { anchor = 'middle', cls = 'comp-lbl' } = {}) {
  return `<text class="${cls}" x="${x}" y="${y}" text-anchor="${anchor}">${text}</text>`;
}

/** Tahta dışı not — sayfa temasının rengini alır. */
export function note(x, y, text, { anchor = 'start', cls = 'note' } = {}) {
  return `<text class="${cls}" x="${x}" y="${y}" text-anchor="${anchor}">${text}</text>`;
}

// ───────────────────────── Bileşenler ─────────────────────────

/** Direnç bantları gerçek değere göre (4 bant, altın tolerans). */
const BANDS = {
  '220Ω':  ['#c8102e', '#c8102e', '#8a5a2b'],   // kırmızı kırmızı kahverengi
  '2.2kΩ': ['#c8102e', '#c8102e', '#c8102e'],   // kırmızı kırmızı kırmızı
  '3.3kΩ': ['#f0932b', '#f0932b', '#c8102e'],   // turuncu turuncu kırmızı
  '10kΩ':  ['#8a5a2b', '#1a1a1a', '#f0932b'],   // kahverengi siyah turuncu
};

/** Direnç — iki delik arasında durur; etiketi ayrıca label() ile yazılır. */
export function resistor(from, to, value) {
  const a = hole(from);
  const b = hole(to);
  const cx = (a.x + b.x) / 2;
  const cy = (a.y + b.y) / 2;
  const angle = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
  const bands = BANDS[value];
  if (!bands) throw new Error(`Bilinmeyen direnc degeri: ${value}`);

  return [
    `<path class="leg" d="M${a.x} ${a.y} L${b.x} ${b.y}" />`,
    `<g transform="translate(${cx} ${cy}) rotate(${angle})">`,
    `  <rect class="res-body" x="-15" y="-5.5" width="30" height="11" rx="4.5" />`,
    `  <rect x="-10.5" y="-5.5" width="3" height="11" fill="${bands[0]}" />`,
    `  <rect x="-5.5"  y="-5.5" width="3" height="11" fill="${bands[1]}" />`,
    `  <rect x="-0.5"  y="-5.5" width="3" height="11" fill="${bands[2]}" />`,
    `  <rect x="7"     y="-5.5" width="3" height="11" fill="#d4a017" />`,
    `</g>`,
  ].join('\n  ');
}

/**
 * LED — üstten görünüm. Gövde iki deliğin ortasında, biraz yukarıda oturur;
 * iki kısa bacak deliklere iner. Uzun bacağın (anot) üstünde koyu bir "+" rozeti var.
 */
export function led(anode, cathode, colour) {
  const a = hole(anode);
  const c = hole(cathode);
  const cx = (a.x + c.x) / 2;
  const cy = (a.y + c.y) / 2 - 4;

  return [
    `<path class="leg" d="M${a.x} ${a.y} L${a.x} ${cy + 2}" />`,
    `<path class="leg" d="M${c.x} ${c.y} L${c.x} ${cy + 2}" />`,
    `<circle class="led-halo" cx="${cx}" cy="${cy}" r="12.5" />`,
    `<circle class="led-body" fill="${colour}" cx="${cx}" cy="${cy}" r="10" />`,
    `<circle class="led-shine" cx="${cx - 3.2}" cy="${cy - 3.2}" r="2.8" />`,
    `<circle class="plus-badge" cx="${a.x}" cy="${a.y - 16}" r="6.5" />`,
    `<text class="plus-mark" x="${a.x}" y="${a.y - 12.2}" text-anchor="middle">+</text>`,
  ].join('\n  ');
}

/** Buton — orta kanalı atlar, dört bacağı f ve e satırlarına oturur. */
export function button(colLeft, colRight) {
  const tl = hole(`f${colLeft}`);
  const tr = hole(`f${colRight}`);
  const bl = hole(`e${colLeft}`);

  const x = tl.x - 8;
  const y = tl.y - 8;
  const w = tr.x - tl.x + 16;
  const h = bl.y - tl.y + 16;

  return [
    `<rect class="btn-body" x="${x}" y="${y}" width="${w}" height="${h}" rx="4" />`,
    `<circle class="btn-cap" cx="${(tl.x + tr.x) / 2}" cy="${(tl.y + bl.y) / 2}" r="11" />`,
    ...[`f${colLeft}`, `f${colRight}`, `e${colLeft}`, `e${colRight}`].map((h2) => {
      const p = hole(h2);
      return `<circle class="btn-leg" cx="${p.x}" cy="${p.y}" r="3.2" />`;
    }),
  ].join('\n  ');
}

/** LDR (foto direnç) — iki delik arasında, üstünde yılankavi desenli disk. */
export function ldr(from, to) {
  const a = hole(from);
  const b = hole(to);
  const cx = (a.x + b.x) / 2;
  const cy = (a.y + b.y) / 2;
  const lines = [-6, -2.5, 1, 4.5].map((dy) => `M${cx - 6} ${cy + dy} h12`).join(' ');
  return [
    `<path class="leg" d="M${a.x} ${a.y} L${b.x} ${b.y}" />`,
    `<circle class="ldr-body" cx="${cx}" cy="${cy}" r="10.5" />`,
    `<path class="ldr-track" d="${lines}" />`,
  ].join('\n  ');
}

/**
 * 3 bacaklı kart (ör. KY-018 ışık sensörü, KY-006 pasif buzzer). Pinleri verilen
 * satırda yan yana üç sütuna oturur; gövde e satırının hemen üstüne kadar uzanır,
 * orta kanaldaki kablo şeritlerine değmez. kind: 'ldr' | 'buzzer'.
 */
export function partModule({ row, colStart, names, kind, title }) {
  const pins = names.map((_, i) => hole(`${row}${colStart + i}`));
  const first = pins[0], last = pins[pins.length - 1];
  const x0 = first.x - 26, x1 = last.x + 26;
  const top = Y_BLOCK_BOT - 6;
  const bottom = first.y - 9;
  const ix = x0 + 13, iy = top + 12;
  const icon = kind === 'ldr'
    ? [
        `<circle class="ldr-body" cx="${ix}" cy="${iy}" r="7.5" />`,
        `<path class="ldr-track" d="${[-4.5, -1.5, 1.5, 4.5].map((dy) => `M${ix - 4.5} ${iy + dy} h9`).join(' ')}" />`,
      ]
    : [
        `<circle class="mod-buzzer" cx="${ix}" cy="${iy}" r="8" />`,
        `<circle class="buzzer-hole" cx="${ix}" cy="${iy}" r="2" />`,
      ];
  return [
    ...pins.map((p) => `<path class="leg" d="M${p.x} ${p.y} L${p.x} ${bottom}" />`),
    `<rect class="part-mod" x="${x0}" y="${top}" width="${x1 - x0}" height="${bottom - top}" rx="4" />`,
    ...icon,
    `<text class="mod-lbl" x="${x0 + 25}" y="${top + 15}">${title}</text>`,
    ...names.map((n, i) => `<text class="pin-name" x="${pins[i].x}" y="${bottom - 3}" text-anchor="middle">${n}</text>`),
    ...pins.map((p) => `<circle class="btn-leg" cx="${p.x}" cy="${p.y}" r="3.2" />`),
  ].join('\n  ');
}

/** Potansiyometre — üç bacağı yan yana aynı satırda, gövdesi üstte. */
export function pot(colStart, row) {
  const legs = [0, 1, 2].map((i) => hole(`${row}${colStart + i}`));
  const cx = legs[1].x;
  const bottom = legs[0].y - 7;
  const top = bottom - 30;
  return [
    ...legs.map((l) => `<path class="leg" d="M${l.x} ${l.y} L${l.x} ${bottom}" />`),
    `<rect class="pot-body" x="${cx - 19}" y="${top}" width="38" height="30" rx="4" />`,
    `<circle class="pot-knob" cx="${cx}" cy="${top + 15}" r="9" />`,
    `<path class="pot-slot" d="M${cx - 5} ${top + 15} h10" />`,
    ...legs.map((l) => `<circle class="btn-leg" cx="${l.x}" cy="${l.y}" r="3" />`),
  ].join('\n  ');
}

/** Pasif buzzer — siyah silindir, ortasında delik; bacakları iki delikte. */
export function buzzer(from, to) {
  const a = hole(from);
  const b = hole(to);
  const cx = (a.x + b.x) / 2;
  const cy = a.y - 9;
  return [
    `<path class="leg" d="M${a.x} ${a.y} L${a.x} ${cy + 8}" />`,
    `<path class="leg" d="M${b.x} ${b.y} L${b.x} ${cy + 8}" />`,
    `<circle class="buzzer-body" cx="${cx}" cy="${cy}" r="15" />`,
    `<circle class="buzzer-hole" cx="${cx}" cy="${cy}" r="3" />`,
  ].join('\n  ');
}

/** 2N2222 (TO-92) — üç bacağı aynı satırda, yarım daire gövde üstte, düz yüz aşağı. */
export function transistor(cols, row) {
  const legs = cols.map((c) => hole(`${row}${c}`));
  const cx = legs[1].x;
  const cy = legs[1].y - 20;
  return [
    ...legs.map((l) => `<path class="leg" d="M${l.x} ${l.y} L${l.x} ${cy}" />`),
    `<path class="to92" d="M${cx - 17} ${cy} A17 17 0 0 1 ${cx + 17} ${cy} Z" />`,
    `<text class="on-dark" x="${cx}" y="${cy - 4}" text-anchor="middle">2N2222</text>`,
    ...['E', 'B', 'C'].map((n, i) => label(legs[i].x, legs[i].y + 14, n, { cls: 'comp-sub' })),
  ].join('\n  ');
}

/**
 * Header pinli parça (DHT11, HC-SR04, OLED): pinleri verilen satırdaki
 * ardışık sütunlara oturur, gövdesi yukarı doğru uzanır (kanalı örtebilir).
 */
export function headerPart({ row, colStart, names, kind, title }) {
  const pins = names.map((_, i) => hole(`${row}${colStart + i}`));
  const first = pins[0], last = pins[pins.length - 1];
  const pad = kind === 'oled' ? 22 : 16;
  const x0 = first.x - pad, x1 = last.x + pad;
  const bodyH = { dht: 62, hcsr04: 66, oled: 84 }[kind];
  const bottom = first.y - 11;
  const top = bottom - bodyH;
  const w = x1 - x0;
  const cx = (x0 + x1) / 2;

  const parts = [
    ...pins.map((p) => `<path class="leg" d="M${p.x} ${p.y} L${p.x} ${bottom}" />`),
    `<rect class="part-${kind}" x="${x0}" y="${top}" width="${w}" height="${bodyH}" rx="5" />`,
  ];

  if (kind === 'dht') {
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 4; c++) {
        parts.push(`<rect class="dht-grid" x="${cx - 18 + c * 9.5}" y="${top + 8 + r * 9}" width="6" height="6" />`);
      }
    }
    parts.push(`<text class="on-dark" x="${cx}" y="${bottom - 20}" text-anchor="middle">${title}</text>`);
  } else if (kind === 'hcsr04') {
    for (const ex of [x0 + w * 0.27, x0 + w * 0.73]) {
      parts.push(
        `<circle class="eye" cx="${ex}" cy="${top + 27}" r="15" />`,
        `<circle class="eye-in" cx="${ex}" cy="${top + 27}" r="9" />`
      );
    }
    parts.push(`<text class="on-dark" x="${cx}" y="${bottom - 20}" text-anchor="middle">${title}</text>`);
  } else if (kind === 'oled') {
    parts.push(
      `<rect class="oled-screen" x="${x0 + 8}" y="${top + 8}" width="${w - 16}" height="42" rx="2" />`,
      `<text class="oled-txt" x="${cx}" y="${top + 28}" text-anchor="middle">23.4°C</text>`,
      `<text class="oled-sub" x="${cx}" y="${top + 42}" text-anchor="middle">nem 48%</text>`,
      `<text class="on-dark" x="${cx}" y="${bottom - 20}" text-anchor="middle">${title}</text>`
    );
  }

  names.forEach((n, i) => {
    parts.push(`<text class="pin-name" x="${pins[i].x}" y="${bottom - 6}" text-anchor="middle">${n}</text>`);
  });
  pins.forEach((p) => parts.push(`<circle class="btn-leg" cx="${p.x}" cy="${p.y}" r="3.2" />`));

  return parts.join('\n  ');
}

/**
 * Tahta dışı modül kutusu (röle, LED şerit, adaptör, servo, PIR).
 * pads: [{ name, side: 'top'|'bottom'|'left'|'right', x?, y? }]
 */
export function moduleBox({ x, y, w, h, title, sub, fill, ink = '#fff', pads = [], extra = '' }) {
  const parts = [
    `<rect class="mod" fill="${fill}" x="${x}" y="${y}" width="${w}" height="${h}" rx="7" />`,
  ];
  if (title) parts.push(`<text class="mod-title" fill="${ink}" x="${x + w / 2}" y="${y + h / 2 + (sub ? -2 : 4)}" text-anchor="middle">${title}</text>`);
  if (sub) parts.push(`<text class="mod-sub" fill="${ink}" x="${x + w / 2}" y="${y + h / 2 + 13}" text-anchor="middle">${sub}</text>`);
  parts.push(extra);

  for (const p of pads) {
    let px, py, tx, ty, anchor = 'middle';
    if (p.side === 'top')         { px = p.x; py = y;     tx = p.x; ty = y + 15; }
    else if (p.side === 'bottom') { px = p.x; py = y + h; tx = p.x; ty = y + h - 7; }
    else if (p.side === 'left')   { px = x;   py = p.y;   tx = x + 11; ty = p.y + 3.6; anchor = 'start'; }
    else                          { px = x + w; py = p.y; tx = x + w - 11; ty = p.y + 3.6; anchor = 'end'; }
    parts.push(
      `<circle class="mod-pad" cx="${px}" cy="${py}" r="4.4" />`,
      `<text class="pin-name" fill="${ink}" x="${tx}" y="${ty}" text-anchor="${anchor}">${p.name}</text>`
    );
  }
  return parts.join('\n  ');
}

/** Dikey kablo üzerinde seri diyot; şeritli (katot) ucu y2 tarafına bakar. */
export function diodeOnWire(x, y1, y2, colour) {
  const mid = (y1 + y2) / 2;
  const dir = Math.sign(y2 - y1);
  return [
    `<path class="w" stroke="${colour}" d="M${x} ${y1} L${x} ${y2}" />`,
    `<circle class="w-end" fill="${colour}" cx="${x}" cy="${y1}" r="3.6" />`,
    `<circle class="w-end" fill="${colour}" cx="${x}" cy="${y2}" r="3.6" />`,
    `<rect class="diode" x="${x - 5}" y="${mid - 11}" width="10" height="22" rx="2" />`,
    `<rect class="diode-band" x="${x - 5}" y="${mid + dir * 6 - 1.5}" width="10" height="3" />`,
  ].join('\n  ');
}

/** Arduino kartı — sağ kenarında yalnızca kullandığımız pinler. pins: [[ad, y], ...] */
export function arduino(pins, { x = 18, y = 84, w = 170, h = 310 } = {}) {
  const parts = [
    `<rect class="ard" x="${x}" y="${y}" width="${w}" height="${h}" rx="10" />`,
    `<text class="ard-title" x="${x + w / 2}" y="${y + 30}" text-anchor="middle">Arduino UNO Q</text>`,
    `<text class="ard-sub" x="${x + w / 2}" y="${y + 48}" text-anchor="middle">3.3V</text>`,
    `<rect class="ard-chip" x="${x + 24}" y="${y + 70}" width="50" height="40" rx="4" />`,
    `<rect class="ard-chip" x="${x + 84}" y="${y + 70}" width="46" height="40" rx="4" />`,
  ];

  for (const [name, py] of pins) {
    parts.push(
      `<circle class="ard-pad" cx="${x + w}" cy="${py}" r="5" />`,
      `<text class="pin" x="${x + w - 13}" y="${py + 4}" text-anchor="end">${name}</text>`
    );
  }
  return { svg: parts.join('\n  '), edgeX: x + w };
}

/**
 * Açıklama satırları. items: [{ c, b, t, kind }] — kind: 'wire' (varsayılan) | 'plus'.
 * Dört sütun, 24 px satır aralığı.
 */
export function legend(items, x, y) {
  const colX = [0, 210, 420, 630];
  const rows = [];
  items.forEach((it, i) => {
    const cx = colX[i % 4];
    const cy = Math.floor(i / 4) * 24;
    if (it.kind === 'plus') {
      rows.push(
        `<circle class="plus-badge" cx="${cx + 13}" cy="${cy}" r="6.5" /><text class="plus-mark" x="${cx + 13}" y="${cy + 3.8}" text-anchor="middle">+</text>`,
        `<text class="legend" x="${cx + 27}" y="${cy + 4}">${it.t}</text>`
      );
    } else {
      rows.push(
        `<line class="w" stroke="${it.c}" x1="${cx}" y1="${cy}" x2="${cx + 26}" y2="${cy}" />`,
        `<text class="legend" x="${cx + 34}" y="${cy + 4}"><tspan class="legend-b">${it.b}</tspan> ${it.t}</text>`
      );
    }
  });
  return `<g transform="translate(${x}, ${y})">\n    ${rows.join('\n    ')}\n  </g>`;
}

export function badge(n, x, y) {
  return `<circle class="badge" cx="${x}" cy="${y}" r="9" /><text class="badge-txt" x="${x}" y="${y + 4}" text-anchor="middle">${n}</text>`;
}

// ───────────────────────── SVG iskeleti ─────────────────────────

const STYLE = `
  .bb         { fill: #eef1f3; stroke: #c2c8cc; stroke-width: 1.5; }
  .channel    { fill: #d9dee2; }
  .hole       { fill: #9aa4aa; }
  .rail-plus  { stroke: #d94a3d; stroke-width: 2; }
  .rail-minus { stroke: #3f7fd0; stroke-width: 2; }
  .rail-lbl   { font-family: ui-sans-serif, system-ui, sans-serif; font-size: 13px; font-weight: 700; }
  .rail-lbl.plus  { fill: #d94a3d; }
  .rail-lbl.minus { fill: #3f7fd0; }
  .rail-name  { font-family: ui-monospace, monospace; font-size: 10.5px; font-weight: 700; }
  .rail-name.plus  { fill: #d94a3d; }
  .rail-name.minus { fill: #3f7fd0; }
  .col-num    { font-family: ui-monospace, monospace; font-size: 9.5px; fill: #6f7d83; }
  .row-lbl    { font-family: ui-monospace, monospace; font-size: 10px; font-weight: 700; fill: #6f7d83; }

  .ard        { fill: #0f7a80; stroke: #0a5a5f; stroke-width: 2; }
  .ard-title  { font-family: ui-sans-serif, system-ui, sans-serif; font-size: 14px; font-weight: 700; fill: #eafafa; }
  .ard-sub    { font-family: ui-sans-serif, system-ui, sans-serif; font-size: 11px; fill: #a9dfe2; }
  .ard-chip   { fill: #0a5a5f; }
  .ard-pad    { fill: #f5c542; stroke: #a8862a; stroke-width: 1.2; }
  .pin        { font-family: ui-monospace, monospace; font-size: 11.5px; font-weight: 700; fill: #eafafa; }

  .w          { fill: none; stroke-width: 3.4; stroke-linecap: round; stroke-linejoin: round; }
  .w-end      { stroke: rgba(0,0,0,.35); stroke-width: 1; }
  .leg        { fill: none; stroke: #8d949a; stroke-width: 2; stroke-linecap: round; }
  .res-body   { fill: #e2d5b0; stroke: #a89876; stroke-width: 1; }
  .led-halo   { fill: rgba(255,255,255,.8); }
  .led-body   { stroke: rgba(0,0,0,.35); stroke-width: 1; }
  .led-shine  { fill: rgba(255,255,255,.75); }
  .plus-badge { fill: #102b2e; }
  .plus-mark  { font-family: ui-sans-serif, system-ui, sans-serif; font-size: 12px; font-weight: 700; fill: #fff; }
  .btn-body   { fill: #4a5157; stroke: #2e3438; stroke-width: 1.5; }
  .btn-cap    { fill: #bcc3c8; stroke: #7d868c; stroke-width: 1.2; }
  .btn-leg    { fill: #c9a227; stroke: #8a6d1a; stroke-width: .8; }
  .ldr-body   { fill: #e8c9a0; stroke: #a07a4a; stroke-width: 1; }
  .ldr-track  { fill: none; stroke: #8a5a2b; stroke-width: 1.4; }
  .part-mod   { fill: #202428; stroke: #000; stroke-width: 1.2; }
  .mod-buzzer { fill: #0b0d0f; stroke: #9ca3af; stroke-width: 1.2; }
  .mod-lbl    { font-family: ui-sans-serif, system-ui, sans-serif; font-size: 8.5px; font-weight: 700; fill: #fff; }
  .pot-body   { fill: #2f6fb3; stroke: #1d4f85; stroke-width: 1.2; }
  .pot-knob   { fill: #e5e7eb; stroke: #6b7280; stroke-width: 1; }
  .pot-slot   { stroke: #374151; stroke-width: 2; }
  .buzzer-body{ fill: #1f2327; stroke: #000; stroke-width: 1; }
  .buzzer-hole{ fill: #6b7280; }
  .to92       { fill: #1f1f1f; stroke: #000; stroke-width: 1; }
  .part-dht   { fill: #3b82c4; stroke: #1e4f80; stroke-width: 1.2; }
  .dht-grid   { fill: #2a63a0; }
  .part-hcsr04{ fill: #2e6fb0; stroke: #1b4a7a; stroke-width: 1.2; }
  .eye        { fill: #c9ced3; stroke: #4b5563; stroke-width: 1.2; }
  .eye-in     { fill: #6b7280; stroke: #374151; stroke-width: 1; }
  .part-oled  { fill: #1b2a3a; stroke: #0b1622; stroke-width: 1.2; }
  .oled-screen{ fill: #071522; stroke: #3aa7b8; stroke-width: 1; }
  .oled-txt   { font-family: ui-monospace, monospace; font-size: 13px; font-weight: 700; fill: #bfefff; }
  .oled-sub   { font-family: ui-monospace, monospace; font-size: 8.5px; fill: #8fd3e0; }
  .on-dark    { font-family: ui-sans-serif, system-ui, sans-serif; font-size: 9.5px; font-weight: 700; fill: #fff; }
  .pin-name   { font-family: ui-monospace, monospace; font-size: 8px; font-weight: 700; fill: #fff; }
  .mod        { stroke: rgba(0,0,0,.35); stroke-width: 1.2; }
  .mod-title  { font-family: ui-sans-serif, system-ui, sans-serif; font-size: 11px; font-weight: 700; }
  .mod-sub    { font-family: ui-sans-serif, system-ui, sans-serif; font-size: 9.5px; opacity: .85; }
  .mod-pad    { fill: #f5c542; stroke: #a8862a; stroke-width: 1.2; }
  .diode      { fill: #1a1a1a; stroke: #000; stroke-width: 1; }
  .diode-band { fill: #d1d5db; }
  .tag        { stroke: rgba(0,0,0,.25); stroke-width: 1; }
  .tag-txt    { font-family: ui-monospace, monospace; font-size: 10.5px; font-weight: 700; fill: #fff; }

  /* Tahta üzerindeki etiketler: tahta her temada açık, bu yüzden sabit koyu renk + açık kontur. */
  .comp-lbl   { font-family: ui-sans-serif, system-ui, sans-serif; font-size: 11.5px; font-weight: 700; fill: #102b2e;
                paint-order: stroke; stroke: #eef1f3; stroke-width: 5px; stroke-linejoin: round; }
  .comp-sub   { font-family: ui-monospace, monospace; font-size: 10.5px; font-weight: 700; fill: #3b4a4e;
                paint-order: stroke; stroke: #eef1f3; stroke-width: 5px; stroke-linejoin: round; }

  /* Tahta dışı: sayfa temasına uyar. */
  .legend     { font-family: ui-sans-serif, system-ui, sans-serif; font-size: 11.5px; fill: var(--text-muted, #5a6f74); }
  .legend-b   { font-family: ui-sans-serif, system-ui, sans-serif; font-size: 11.5px; font-weight: 700; fill: var(--text, #102b2e); }
  .note       { font-family: ui-sans-serif, system-ui, sans-serif; font-size: 11.5px; font-weight: 700; fill: var(--text, #102b2e); }
  .note-muted { font-family: ui-sans-serif, system-ui, sans-serif; font-size: 11px; fill: var(--text-muted, #5a6f74); }
  .badge      { fill: #00979d; }
  .badge-txt  { font-family: ui-sans-serif, system-ui, sans-serif; font-size: 11px; font-weight: 700; fill: #fff; }
`;

export function svg({ title, width = WIDTH, height, body }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${title}">
  <title>${title}</title>
  <style>${STYLE}</style>
  ${body}
</svg>
`;
}

export function write(name, content) {
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, name), content, 'utf8');
  console.log('yazildi:', name, `(${content.length} bayt)`);
}
