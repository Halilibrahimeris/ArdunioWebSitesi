/**
 * Breadboard şemaları / Breadboard diagrams
 *
 * Çalıştırma:  node scripts/gen-breadboard.mjs
 *
 * Parça çizimleri ve ölçüler breadboard-lib.mjs içinde. Bu dosya her proje
 * için yerleşimi ve kablo yollarını tanımlar.
 *
 * Kablo yolları üç türdür ve hiçbiri diğerini kesmez:
 *   - Kanal şeridi: kablo orta kanaldan ilerler, hedef sütunda alt bloğa (e) iner
 *     ya da üst bloğa (f) çıkar.
 *   - Tahta üstü:   kablo tahtanın üstünden dolanır, üst bloğa (j) veya üst hatta iner.
 *   - Tahta altı:   kablo tahtanın altından dolanır, alt bloğa (a) çıkar.
 *
 * Kesişmeme kuralı (her yol türü için aynı): daha uzağa giden kablo daha dış
 * şeritte ilerler; pin sırası ve dikey iniş çizgilerinin (trunk) sırası da
 * buna göre dizilir. Yerleşimler bu kurala göre elle hesaplanmıştır.
 */

import {
  P, BX, BY, BOARD_W, BOARD_BOTTOM, Y_CHANNEL, Y_BOT_MINUS, Y_BOT_PLUS, Y_TOP_MINUS,
  TOP_ROUTE_Y, bottomLane, hole, breadboardBase, wire, route, tag, label, note,
  resistor, led, button, ldr, partModule, pot, buzzer, transistor, headerPart, moduleBox,
  diodeOnWire, arduino, legend, badge, svg, write,
} from './breadboard-lib.mjs';

// Kablo renkleri — jumper setlerinde bulunan renkler
const C = {
  D2:  '#0d8ce0',   // mavi
  D3:  '#8b5cf6',   // mor
  D4:  '#f97316',   // turuncu
  D5:  '#ec4899',   // pembe
  D6:  '#16a34a',   // yeşil
  D7:  '#ec4899',   // pembe
  D8:  '#ca8a04',   // sarı (koyu)
  D9:  '#8b5cf6',   // mor
  D10: '#f97316',   // turuncu
  A0:  '#a05a2c',   // kahverengi
  A1:  '#0d9488',   // turkuaz
  SDA: '#0d8ce0',   // mavi
  SCL: '#ca8a04',   // sarı (koyu)
  V33: '#d94a3d',   // kırmızı
  V5:  '#d94a3d',   // kırmızı
  V33ALT: '#0d9488', // turkuaz — + hattı 5V olan projede ayrı 3V3 kablosu
  GND: '#2b3136',   // siyah
};

const RAIL_TOP = Y_TOP_MINUS;
const laneUp = (k) => Y_CHANNEL - 14 + k * 7;   // kanal şeritleri (5 şeride kadar)

/** Tahta üstü etiketi: kart tarafındaki üst yol kablosunun sağında kalır. */
const noteAbove = (text, x = BX + 70) => note(x, BY - 9, text);

/** Kartlı şemaların dosya adı — projects.ts'teki picker() ile aynı kural. */
const variantFile = (base, { dht = false, light = false, buzzer = false }) =>
  `${base}${dht ? '-dht-module' : ''}${light ? '-light-module' : ''}${buzzer ? '-buzzer-module' : ''}-breadboard.svg`;

/** Kartlı şemalarda A0 açıklaması ve pin sırası uyarısı. */
const A0_MODULE = '→ kartın S pini / module S';
const moduleNote = (y) =>
  note(18, y, 'Pin sırası karttan karta değişir, yazılara göre bağla / Pin order varies, follow the labels on your module', { cls: 'note-muted' });

// ═══════════════════ Ortak LED şeritleri ═══════════════════

/** Alt blokta LED şeridi: e(n) kablo · c(n)→c(n+3) 220Ω · a(n+3)/a(n+4) LED · b(n+4)→−(n+4). */
function ledLaneBottom(n, colour, name) {
  return [
    resistor(`c${n}`, `c${n + 3}`, '220Ω'),
    led(`a${n + 3}`, `a${n + 4}`, colour),
    wire([`b${n + 4}`, `M${n + 4}`], C.GND),
    label(hole(`c${n}`).x - 4, hole('d1').y + 4, name, { anchor: 'start' }),
    label((hole(`c${n}`).x + hole(`c${n + 3}`).x) / 2, hole('b1').y + 4, '220Ω', { cls: 'comp-sub' }),
  ].join('\n  ');
}

/** Üst blokta LED şeridi: f(n) kablo · g(n)→g(n+3) 220Ω · i(n+3)/i(n+4) LED · j(n+4)→üst −(n+4). */
function ledLaneTop(n, colour) {
  return [
    resistor(`g${n}`, `g${n + 3}`, '220Ω'),
    led(`i${n + 3}`, `i${n + 4}`, colour),
    wire([`j${n + 4}`, `m${n + 4}`], C.GND),
    label((hole(`g${n}`).x + hole(`g${n + 3}`).x) / 2, hole('h1').y + 4, '220Ω', { cls: 'comp-sub' }),
  ].join('\n  ');
}

/** Karttan üst eksi hattına giden ikinci GND kablosu (tahtanın üstünden). */
function gndToTopRail(edgeX, pinY) {
  const m1 = hole('m1');
  return [
    wire([{ x: edgeX, y: pinY }, { x: 250, y: pinY }, { x: 250, y: TOP_ROUTE_Y }, { x: m1.x, y: TOP_ROUTE_Y }, m1], C.GND),
    tag(m1.x, TOP_ROUTE_Y + 16, 'GND', C.GND),
  ].join('\n  ');
}

// ═══════════════════ Proje 1 — Trafik Lambası ═══════════════════
//
//   - LED şeritleri alt blokta: kırmızı 3-7, sarı 11-15, yeşil 19-23.
//   - Buton sağ uçta (26/28). D7 tahtanın üstünden j26'ya iner; 3V3 alt artı
//     hattına, +28 → a28 jumper'ı butona taşır; 10kΩ b26 → −26.
//   - LED kabloları kanalda üç şerit: en yakın sütun (D2) en üstte.

{
  const pins = [['D7', 118], ['D4', 148], ['D3', 178], ['D2', 208], ['GND', 296], ['3V3', 330]];
  const ard = arduino(pins);
  const EX = ard.edgeX;

  const body = [
    breadboardBase({ leftRailLabels: false, railNames: { M: 'GND', P: '3V3' } }),
    ard.svg,

    route(EX, 296, 230, Y_BOT_MINUS, 'M1', C.GND),
    route(EX, 330, 212, Y_BOT_PLUS, 'P1', C.V33),

    route(EX, 208, 204, laneUp(4), 'e3', C.D2),
    route(EX, 178, 220, laneUp(3), 'e11', C.D3),
    route(EX, 148, 236, laneUp(2), 'e19', C.D4),
    route(EX, 118, 250, TOP_ROUTE_Y, 'j26', C.D7),

    ledLaneBottom(3, '#e02020', 'Kırmızı LED / Red'),
    ledLaneBottom(11, '#e0b020', 'Sarı LED / Yellow'),
    ledLaneBottom(19, '#20b050', 'Yeşil LED / Green'),

    button(26, 28),
    resistor('b26', 'M26', '10kΩ'),
    wire(['P28', 'a28'], C.V33),
    label(hole('h27').x, hole('h1').y + 4, 'Buton / Button'),
    label(hole('b26').x - 24, hole('b26').y + 30, '10kΩ', { cls: 'comp-sub' }),

    tag(hole('e3').x + 16, hole('e3').y - 1, 'D2', C.D2),
    tag(hole('e11').x + 16, hole('e11').y - 1, 'D3', C.D3),
    tag(hole('e19').x + 16, hole('e19').y - 1, 'D4', C.D4),
    tag(hole('j26').x + 18, hole('j26').y - 14, 'D7', C.D7),
    tag(hole('a28').x + 20, hole('a28').y - 1, '3V3', C.V33),

    legend([
      { c: C.D2, b: 'D2', t: '→ kırmızı LED / red LED' },
      { c: C.D3, b: 'D3', t: '→ sarı LED / yellow LED' },
      { c: C.D4, b: 'D4', t: '→ yeşil LED / green LED' },
      { c: C.D7, b: 'D7', t: '→ buton / button' },
      { c: C.V33, b: '3V3', t: '→ + hattı / + rail' },
      { c: C.GND, b: 'GND', t: '→ − hattı / − rail' },
      { kind: 'plus', t: "= LED'in uzun bacağı / the LED's long leg" },
    ], 18, BOARD_BOTTOM + 34),
  ].join('\n  ');

  write('01-traffic-light-breadboard.svg', svg({
    title: 'Trafik lambasi breadboard yerlesimi / Traffic light breadboard layout',
    height: BOARD_BOTTOM + 78,
    body,
  }));
}

// ═══════════════════ Proje 2 — Işık ve Ses Ölçer ═══════════════════
//
//   - Beş LED üst blokta (1-5, 7-11, 13-17, 19-23, 25-29); kanaldan beş şerit,
//     en yakın sütun (D2) en üstte. Katotlar üst eksi hattına; oraya ikinci GND.
//   - Alt blok: LDR (2-8), potansiyometre (13-15), buzzer (20-25).
//     A0, A1, D8 tahtanın altından dolanıp a satırına çıkar.
//   - Kart çeşitleri: ışık sensörü kartı c3/c4/c5 (S VCC GND) → A0 a3'e,
//     a4 → +4, a5 → −5. Buzzer kartı c25/c26/c27 (S VCC GND) → 220Ω b22→b25,
//     D8 a22'ye, a26 → +26, a27 → −27.

function lightSoundMeterDiagram(name, title, { lightMod = false, buzzerMod = false } = {}) {
  const pins = [['GND', 92], ['D2', 114], ['D3', 136], ['D4', 158], ['D5', 180], ['D6', 202],
                ['GND', 246], ['3V3', 268], ['A0', 300], ['A1', 322], ['D8', 344]];
  const ard = arduino(pins);
  const EX = ard.edgeX;

  const body = [
    breadboardBase({ leftRailLabels: false, railNames: { m: 'GND', M: 'GND', P: '3V3' } }),
    ard.svg,

    gndToTopRail(EX, 92),
    route(EX, 246, 230, Y_BOT_MINUS, 'M1', C.GND),
    route(EX, 268, 212, Y_BOT_PLUS, 'P1', C.V33),

    // LED şeritleri: kanaldan üst bloğa
    route(EX, 114, 244, laneUp(0), 'f1', C.D2),
    route(EX, 136, 234, laneUp(1), 'f7', C.D3),
    route(EX, 158, 224, laneUp(2), 'f13', C.D4),
    route(EX, 180, 214, laneUp(3), 'f19', C.D5),
    route(EX, 202, 204, laneUp(4), 'f25', C.D6),
    ledLaneTop(1, '#20b050'),
    ledLaneTop(7, '#20b050'),
    ledLaneTop(13, '#e0b020'),
    ledLaneTop(19, '#e0b020'),
    ledLaneTop(25, '#e02020'),
    ...[['f1', 'D2', C.D2], ['f7', 'D3', C.D3], ['f13', 'D4', C.D4], ['f19', 'D5', C.D5], ['f25', 'D6', C.D6]]
      .map(([h, t, c]) => tag(hole(h).x + 16, hole(h).y - 1, t, c)),
    noteAbove('LED çubuğu / LED bar — D2 → D6 soldan sağa / left to right', BX + 70),

    ...(lightMod
      ? [
          // Işık sensörü kartı: LDR ve 10kΩ kartın üstünde hazır
          partModule({ row: 'c', colStart: 3, names: ['S', 'VCC', 'GND'], kind: 'ldr', title: 'LDR kartı' }),
          wire(['a4', 'P4'], C.V33),
          wire(['a5', 'M5'], C.GND),
          route(EX, 300, 204, bottomLane(0), 'a3', C.A0),
        ]
      : [
          // LDR gerilim bölücü: 3V3 → LDR → A0, A0 → 10kΩ → GND
          wire(['P2', 'a2'], C.V33),
          ldr('c2', 'c5'),
          resistor('b5', 'b8', '10kΩ'),
          wire(['a8', 'M8'], C.GND),
          route(EX, 300, 204, bottomLane(0), 'a5', C.A0),
          label(hole('c2').x - 4, hole('d1').y + 4, 'LDR (ışık / light)', { anchor: 'start' }),
          label((hole('b5').x + hole('b8').x) / 2, hole('a1').y + 4, '10kΩ', { cls: 'comp-sub' }),
        ]),

    // Potansiyometre: sol uç 3V3, orta A1, sağ uç GND
    pot(13, 'c'),
    wire(['a13', 'P13'], C.V33),
    wire(['a15', 'M15'], C.GND),
    route(EX, 322, 198, bottomLane(1), 'a14', C.A1),
    label(hole('c12').x - 2, hole('d1').y + 4, 'Pot 10kΩ', { anchor: 'end' }),

    ...(buzzerMod
      ? [
          // Buzzer kartı: D8 → 220Ω → S; kart + hattından (3V3) beslenir
          resistor('b22', 'b25', '220Ω'),
          partModule({ row: 'c', colStart: 25, names: ['S', 'VCC', 'GND'], kind: 'buzzer', title: 'Buzzer kartı' }),
          wire(['a26', 'P26'], C.V33),
          wire(['a27', 'M27'], C.GND),
          route(EX, 344, 192, bottomLane(2), 'a22', C.D8),
          label((hole('b22').x + hole('b25').x) / 2, hole('a1').y + 4, '220Ω', { cls: 'comp-sub' }),
        ]
      : [
          // Buzzer: D8 → 220Ω → buzzer → GND
          resistor('b20', 'b23', '220Ω'),
          buzzer('c23', 'c25'),
          wire(['a25', 'M25'], C.GND),
          route(EX, 344, 192, bottomLane(2), 'a20', C.D8),
          label(hole('c20').x - 4, hole('d1').y + 4, 'Pasif buzzer + 220Ω', { anchor: 'start' }),
        ]),

    tag(hole(lightMod ? 'a3' : 'a5').x - 24, bottomLane(0), 'A0', C.A0),
    tag(hole('a14').x - 24, bottomLane(1), 'A1', C.A1),
    tag(hole(buzzerMod ? 'a22' : 'a20').x - 24, bottomLane(2), 'D8', C.D8),

    legend([
      { c: C.D2, b: 'D2…D6', t: '→ LED çubuğu / LED bar' },
      { c: C.A0, b: 'A0', t: lightMod ? A0_MODULE : '→ LDR (ışık / light)' },
      { c: C.A1, b: 'A1', t: '→ pot (eşik / threshold)' },
      { c: C.D8, b: 'D8', t: buzzerMod ? '→ 220Ω → kart S / module S' : '→ buzzer' },
      { c: C.V33, b: '3V3', t: '→ + hattı / + rail' },
      { c: C.GND, b: 'GND', t: '→ − hatları / − rails' },
      { kind: 'plus', t: "= LED'in uzun bacağı / long leg" },
    ], 18, bottomLane(2) + 34),
    ...(lightMod || buzzerMod ? [moduleNote(bottomLane(2) + 82)] : []),
  ].join('\n  ');

  write(name, svg({ title, height: bottomLane(2) + (lightMod || buzzerMod ? 100 : 82), body }));
}

lightSoundMeterDiagram(variantFile('02-light-sound-meter', {}),
  'Isik ve ses olcer breadboard yerlesimi / Light and sound meter breadboard layout');
lightSoundMeterDiagram(variantFile('02-light-sound-meter', { light: true }),
  'Isik ve ses olcer, isik sensoru kartiyla / Light and sound meter with a light sensor module', { lightMod: true });
lightSoundMeterDiagram(variantFile('02-light-sound-meter', { buzzer: true }),
  'Isik ve ses olcer, buzzer kartiyla / Light and sound meter with a buzzer module', { buzzerMod: true });
lightSoundMeterDiagram(variantFile('02-light-sound-meter', { light: true, buzzer: true }),
  'Isik ve ses olcer, isik ve buzzer kartlariyla / Light and sound meter with light and buzzer modules',
  { lightMod: true, buzzerMod: true });

// ═══════════════════ Proje 3 — Park Sensörü ═══════════════════
//
//   - Üç LED üst blokta (1-5, 7-11, 13-17), kanaldan üç şerit.
//   - Alt blok: buzzer (2-7), HC-SR04 header e20..e23 (VCC TRIG ECHO GND),
//     gerilim bölücü 2.2kΩ d22→d25, 3.3kΩ c25→c28, orta nokta 25. sütun → D9.
//   - Alt artı hattı bu projede 5V taşır (sensör 5V ister).
//   - Buzzer kartı çeşidi (buzzerMod): kart c5/c6/c7 (S VCC GND), 220Ω b2→b5.
//     Kartın VCC'si + hattına (5V) DEĞİL, ayrı bir 3V3 kablosuyla a6'ya gider;
//     bu kablo için alttan dördüncü bir şerit açılır, dikey inişler sola kayar.

function parkingSensorDiagram(name, title, buzzerMod = false) {
  // Her kablo için [kart pininin y'si, dikey iniş x'i, alt şerit numarası]
  const W = buzzerMod
    ? { gnd: [240, 250], v5: [262, 239], d8: [284, 228, 0], v33: [306, 217, 1], d10: [328, 206, 2], d9: [350, 195, 3] }
    : { gnd: [240, 230], v5: [264, 212], d8: [300, 204, 0], d10: [322, 198, 1], d9: [344, 192, 2] };
  const lastLane = buzzerMod ? 3 : 2;
  const pins = [['GND', 92], ['D2', 118], ['D3', 148], ['D4', 178],
                ['GND', W.gnd[0]], ['5V', W.v5[0]], ['D8', W.d8[0]],
                ...(buzzerMod ? [['3V3', W.v33[0]]] : []),
                ['D10', W.d10[0]], ['D9', W.d9[0]]];
  const ard = arduino(pins);
  const EX = ard.edgeX;

  const body = [
    breadboardBase({ leftRailLabels: false, railNames: { m: 'GND', M: 'GND', P: '5V' } }),
    ard.svg,

    gndToTopRail(EX, 92),
    route(EX, W.gnd[0], W.gnd[1], Y_BOT_MINUS, 'M1', C.GND),
    route(EX, W.v5[0], W.v5[1], Y_BOT_PLUS, 'P1', C.V5),

    route(EX, 118, 236, laneUp(1), 'f1', C.D2),
    route(EX, 148, 220, laneUp(2), 'f7', C.D3),
    route(EX, 178, 204, laneUp(3), 'f13', C.D4),
    ledLaneTop(1, '#e02020'),
    ledLaneTop(7, '#e0b020'),
    ledLaneTop(13, '#20b050'),
    tag(hole('f1').x + 16, hole('f1').y - 1, 'D2', C.D2),
    tag(hole('f7').x + 16, hole('f7').y - 1, 'D3', C.D3),
    tag(hole('f13').x + 16, hole('f13').y - 1, 'D4', C.D4),
    note(hole('g3').x, BY - 9, 'Kırmızı / Red', { anchor: 'middle' }),
    note(hole('g9').x, BY - 9, 'Sarı / Yellow', { anchor: 'middle' }),
    note(hole('g15').x, BY - 9, 'Yeşil / Green', { anchor: 'middle' }),

    // Buzzer: D8 → 220Ω → buzzer (ya da buzzer kartının S pini) → GND
    resistor('b2', 'b5', '220Ω'),
    ...(buzzerMod
      ? [
          partModule({ row: 'c', colStart: 5, names: ['S', 'VCC', 'GND'], kind: 'buzzer', title: 'Buzzer kartı' }),
          wire(['a7', 'M7'], C.GND),
          route(EX, W.d8[0], W.d8[1], bottomLane(W.d8[2]), 'a2', C.D8),
          route(EX, W.v33[0], W.v33[1], bottomLane(W.v33[2]), 'a6', C.V33ALT),
          label((hole('b2').x + hole('b5').x) / 2, hole('a1').y + 4, '220Ω', { cls: 'comp-sub' }),
        ]
      : [
          buzzer('c5', 'c7'),
          wire(['a7', 'M7'], C.GND),
          route(EX, W.d8[0], W.d8[1], bottomLane(W.d8[2]), 'a2', C.D8),
          label(hole('c2').x - 4, hole('d1').y + 4, 'Pasif buzzer + 220Ω', { anchor: 'start' }),
        ]),

    // HC-SR04 ve gerilim bölücü
    headerPart({ row: 'e', colStart: 20, names: ['VCC', 'TRIG', 'ECHO', 'GND'], kind: 'hcsr04', title: 'HC-SR04' }),
    wire(['a20', 'P20'], C.V5),
    wire(['a23', 'M23'], C.GND),
    route(EX, W.d10[0], W.d10[1], bottomLane(W.d10[2]), 'a21', C.D10),
    resistor('d22', 'd25', '2.2kΩ'),
    resistor('c25', 'c28', '3.3kΩ'),
    wire(['a28', 'M28'], C.GND),
    route(EX, W.d9[0], W.d9[1], bottomLane(W.d9[2]), 'a25', C.D9),
    label(hole('c23').x, hole('c1').y + 4, '2.2kΩ', { cls: 'comp-sub' }),
    label((hole('c25').x + hole('c28').x) / 2, hole('b1').y + 4, '3.3kΩ', { cls: 'comp-sub' }),
    label(hole('d18').x, hole('d1').y + 4, 'ECHO 5V → 3.0V', { anchor: 'end' }),

    tag(hole('a2').x + 24, bottomLane(W.d8[2]), 'D8', C.D8),
    ...(buzzerMod ? [tag(hole('a6').x + 26, bottomLane(W.v33[2]), '3V3', C.V33ALT)] : []),
    tag(hole('a21').x - 24, bottomLane(W.d10[2]), 'D10', C.D10),
    tag(hole('a25').x - 60, bottomLane(W.d9[2]), 'D9', C.D9),

    // Kartlı çeşitte sekiz öğe var; uzun D9 yazısı yan sütuna taşmasın diye son sütuna alınır.
    legend(buzzerMod
      ? [
          { c: C.D2, b: 'D2 D3 D4', t: '→ LED\'ler / LEDs' },
          { c: C.D8, b: 'D8', t: '→ 220Ω → kart S / module S' },
          { c: C.V33ALT, b: '3V3', t: '→ kart VCC / module VCC' },
          { c: C.D10, b: 'D10', t: '→ TRIG (3.3V yeter / is fine)' },
          { c: C.V5, b: '5V', t: '→ + hattı / + rail (HC-SR04)' },
          { c: C.GND, b: 'GND', t: '→ − hatları / − rails' },
          { kind: 'plus', t: "= LED'in uzun bacağı / long leg" },
          { c: C.D9, b: 'D9', t: '← ECHO, bölücüden / via divider' },
        ]
      : [
          { c: C.D2, b: 'D2 D3 D4', t: '→ LED\'ler / LEDs' },
          { c: C.D8, b: 'D8', t: '→ buzzer' },
          { c: C.D10, b: 'D10', t: '→ TRIG (3.3V yeter / is fine)' },
          { c: C.D9, b: 'D9', t: '← ECHO, bölücüden / via divider' },
          { c: C.V5, b: '5V', t: '→ + hattı / + rail (HC-SR04)' },
          { c: C.GND, b: 'GND', t: '→ − hatları / − rails' },
          { kind: 'plus', t: "= LED'in uzun bacağı / long leg" },
        ],
    18, bottomLane(lastLane) + 34),
    ...(buzzerMod ? [moduleNote(bottomLane(lastLane) + 82)] : []),
  ].join('\n  ');

  write(name, svg({ title, height: bottomLane(lastLane) + (buzzerMod ? 100 : 82), body }));
}

parkingSensorDiagram('03-parking-sensor-breadboard.svg',
  'Park sensoru breadboard yerlesimi / Parking sensor breadboard layout');
parkingSensorDiagram(variantFile('03-parking-sensor', { buzzer: true }),
  'Park sensoru, buzzer kartiyla / Parking sensor with a buzzer module', true);

// 6. proje aynı devreyi kullanıyor — değişen tek şey kod. Şemayı da aynı
// fonksiyondan üretiyoruz ki iki sayfadaki yerleşim birbirinin aynısı olsun.
// Project 6 reuses this exact circuit; only the code changes.
parkingSensorDiagram('06-distance-game-breadboard.svg',
  'Mesafe oyunu breadboard yerlesimi / Distance game breadboard layout');
parkingSensorDiagram(variantFile('06-distance-game', { buzzer: true }),
  'Mesafe oyunu, buzzer kartiyla / Distance game with a buzzer module', true);

// ═══════════════════ Proje 4 — OLED Hava İstasyonu ═══════════════════
//
//   - DHT11 header e4..e7 (VCC DATA NC GND). 3V3 düğümü 2. sütun: +2 → a2,
//     10kΩ b2→b5 (pull-up), c2→c4 jumper (VCC). GND a7 → −7. D7 → a5.
//   - OLED header e14..e17 (VCC GND SCL SDA): a14 → +14, a15 → −15, SCL → a16, SDA → a17.

function dhtBlock(dhtMod = false) {
  if (dhtMod) {
    // 3 bacaklı DHT11 kartı: pull-up direnci kartın üstünde hazır.
    // e5..e7 (VCC DATA GND): a5 → +5, D7 → a6, a7 → −7 (6. sütunda hat deliği yok).
    return [
      headerPart({ row: 'e', colStart: 5, names: ['VCC', 'DATA', 'GND'], kind: 'dht', title: 'DHT11' }),
      wire(['a5', 'P5'], C.V33),
      wire(['a7', 'M7'], C.GND),
    ].join('\n  ');
  }
  return [
    wire(['P2', 'a2'], C.V33),
    resistor('b2', 'b5', '10kΩ'),
    wire(['c2', 'c4'], C.V33),
    headerPart({ row: 'e', colStart: 4, names: ['VCC', 'DATA', 'NC', 'GND'], kind: 'dht', title: 'DHT11' }),
    wire(['a7', 'M7'], C.GND),
    label((hole('b2').x + hole('b5').x) / 2, hole('a1').y + 4, '10kΩ', { cls: 'comp-sub' }),
  ].join('\n  ');
}

/** DHT11 DATA pininin deliği: çıplak sensörde a5, kartta a6. */
const dhtData = (dhtMod) => (dhtMod ? 'a6' : 'a5');
const DHT_MODULE = '→ DHT11 DATA / OUT';


function weatherStationDiagram(name, title, dhtMod = false) {
  const pins = [['GND', 140], ['3V3', 164], ['D7', 220], ['SCL', 242], ['SDA', 264]];
  const ard = arduino(pins);
  const EX = ard.edgeX;

  const body = [
    breadboardBase({ leftRailLabels: false, railNames: { M: 'GND', P: '3V3' } }),
    ard.svg,

    route(EX, 140, 230, Y_BOT_MINUS, 'M1', C.GND),
    route(EX, 164, 212, Y_BOT_PLUS, 'P1', C.V33),

    dhtBlock(dhtMod),
    route(EX, 220, 204, bottomLane(0), dhtData(dhtMod), C.D7),

    headerPart({ row: 'e', colStart: 14, names: ['VCC', 'GND', 'SCL', 'SDA'], kind: 'oled', title: 'SSD1306 OLED' }),
    wire(['a14', 'P14'], C.V33),
    wire(['a15', 'M15'], C.GND),
    route(EX, 242, 198, bottomLane(1), 'a16', C.SCL),
    route(EX, 264, 192, bottomLane(2), 'a17', C.SDA),

    tag(hole(dhtData(dhtMod)).x - 24, bottomLane(0), 'D7', C.D7),
    tag(hole('a16').x - 40, bottomLane(1), 'SCL', C.SCL),
    tag(hole('a17').x - 82, bottomLane(2), 'SDA', C.SDA),
    noteAbove('OLED pin sırası değişebilir, modülün yazısına bak / OLED pin order varies, read its labels', BX + 20),

    legend([
      { c: C.D7, b: 'D7', t: dhtMod ? DHT_MODULE : '→ DHT11 DATA' },
      { c: C.SCL, b: 'SCL', t: '→ OLED SCL (A5 değil / not A5)' },
      { c: C.SDA, b: 'SDA', t: '→ OLED SDA (A4 değil / not A4)' },
      { c: C.V33, b: '3V3', t: '→ + hattı / + rail' },
      { c: C.GND, b: 'GND', t: '→ − hattı / − rail' },
    ], 18, bottomLane(2) + 34),
    ...(dhtMod ? [moduleNote(bottomLane(2) + 82)] : []),
  ].join('\n  ');

  write(name, svg({ title, height: bottomLane(2) + (dhtMod ? 100 : 60), body }));
}

weatherStationDiagram(variantFile('04-weather-station', {}),
  'OLED hava istasyonu breadboard yerlesimi / OLED weather station breadboard layout');
weatherStationDiagram(variantFile('04-weather-station', { dht: true }),
  'OLED hava istasyonu, DHT11 kartiyla / OLED weather station with a DHT11 module', true);

// ═══════════════════ Proje 5 ve 8 — DHT11 + LDR ═══════════════════
//
//   - DHT11 4. projedeki gibi (2-7). LDR: +13 → a13, LDR c13→c16,
//     10kΩ b16→b19, a19 → −19, A0 → a16.
//   - Kart çeşidi (lightMod): ışık sensörü kartı c14/c15/c16 (S VCC GND):
//     A0 a14'e, a15 → +15, a16 → −16.

function dhtLdrDiagram(name, title, { dhtMod = false, lightMod = false } = {}) {
  const pins = [['GND', 140], ['3V3', 164], ['D7', 230], ['A0', 252]];
  const ard = arduino(pins);
  const EX = ard.edgeX;

  const body = [
    breadboardBase({ leftRailLabels: false, railNames: { M: 'GND', P: '3V3' } }),
    ard.svg,

    route(EX, 140, 230, Y_BOT_MINUS, 'M1', C.GND),
    route(EX, 164, 212, Y_BOT_PLUS, 'P1', C.V33),

    dhtBlock(dhtMod),
    route(EX, 230, 204, bottomLane(0), dhtData(dhtMod), C.D7),

    ...(lightMod
      ? [
          partModule({ row: 'c', colStart: 14, names: ['S', 'VCC', 'GND'], kind: 'ldr', title: 'LDR kartı' }),
          wire(['a15', 'P15'], C.V33),
          wire(['a16', 'M16'], C.GND),
          route(EX, 252, 198, bottomLane(1), 'a14', C.A0),
        ]
      : [
          wire(['P13', 'a13'], C.V33),
          ldr('c13', 'c16'),
          resistor('b16', 'b19', '10kΩ'),
          wire(['a19', 'M19'], C.GND),
          route(EX, 252, 198, bottomLane(1), 'a16', C.A0),
          label(hole('c13').x - 4, hole('d1').y + 4, 'LDR (ışık / light)', { anchor: 'start' }),
          label((hole('b16').x + hole('b19').x) / 2, hole('a1').y + 4, '10kΩ', { cls: 'comp-sub' }),
        ]),

    tag(hole(dhtData(dhtMod)).x - 24, bottomLane(0), 'D7', C.D7),
    tag(hole(lightMod ? 'a14' : 'a16').x - 24, bottomLane(1), 'A0', C.A0),
    noteAbove('Devre 4. ve 2. projelerle aynı / Same circuit as projects 4 and 2', BX + 20),

    legend([
      { c: C.D7, b: 'D7', t: dhtMod ? DHT_MODULE : '→ DHT11 DATA' },
      { c: C.A0, b: 'A0', t: lightMod ? A0_MODULE : '→ LDR (ışık / light)' },
      { c: C.V33, b: '3V3', t: '→ + hattı / + rail' },
      { c: C.GND, b: 'GND', t: '→ − hattı / − rail' },
    ], 18, bottomLane(1) + 34),
    ...(dhtMod || lightMod ? [moduleNote(bottomLane(1) + 60)] : []),
  ].join('\n  ');

  write(name, svg({ title, height: bottomLane(1) + (dhtMod || lightMod ? 76 : 60), body }));
}

for (const [base, name] of [
  ['05-data-logger', 'Veri kaydedici / Data logger'],
  ['08-live-dashboard', 'Canli panel / Live dashboard'],
]) {
  for (const dht of [false, true]) {
    for (const light of [false, true]) {
      const parts = [dht && 'DHT11 karti / DHT11 module', light && 'isik sensoru karti / light sensor module'].filter(Boolean);
      dhtLdrDiagram(variantFile(base, { dht, light }),
        `${name}${parts.length ? ` — ${parts.join(', ')}` : ' breadboard yerlesimi / breadboard layout'}`,
        { dhtMod: dht, lightMod: light });
    }
  }
}

// ═══════════════════ Proje 7 — Akıllı Priz ═══════════════════
//
//   - Modüller tahtanın altında: WS2812 çubuk, röle modülü, harici adaptör.
//   - Alt hatlar: − = ortak GND, + = HARİCİ 5V (kartın 5V pini kullanılmaz).
//   - 2N2222 c15/c16/c17 (E B C). D5 kanaldan e13'e; 10kΩ b13→b16; E a15 → −15;
//     C a17 → röle IN. D6 tahtanın altından şeridin DIN'ine.

{
  const pins = [['D5', 178], ['GND', 250], ['D6', 300]];
  const ard = arduino(pins);
  const EX = ard.edgeX;
  const MOD_Y = BOARD_BOTTOM + 52;
  const MOD_H = 72;

  const stickLeds = [...Array(8)].map((_, i) =>
    `<circle cx="${292 + i * 17}" cy="${MOD_Y + 52}" r="5" fill="${['#e02020', '#f97316', '#e0b020', '#20b050', '#0d8ce0', '#8b5cf6', '#ec4899', '#f9fafb'][i]}" stroke="rgba(0,0,0,.4)" />`
  ).join('');

  const body = [
    breadboardBase({ leftRailLabels: false, railNames: { M: 'GND', P: '5V ext' } }),
    ard.svg,

    route(EX, 250, 230, Y_BOT_MINUS, 'M1', C.GND),

    // Transistör sürücü
    route(EX, 178, 220, Y_CHANNEL, 'e13', C.D5),
    resistor('b13', 'b16', '10kΩ'),
    transistor([15, 16, 17], 'c'),
    wire(['a15', 'M15'], C.GND),
    wire(['a17', { x: hole('a17').x, y: MOD_Y }], C.D5),
    label(hole('c14').x - 4, hole('c1').y + 4, '10kΩ', { cls: 'comp-sub', anchor: 'end' }),
    tag(hole('e13').x + 16, hole('e13').y - 1, 'D5', C.D5),

    // Röle modülü
    moduleBox({
      x: 522, y: MOD_Y, w: 138, h: MOD_H, fill: '#1e5f8f',
      title: 'Röle modülü / Relay', sub: 'aktif-DÜŞÜK · opto',
      pads: [{ name: 'IN', side: 'top', x: hole('a17').x }, { name: 'VCC', side: 'top', x: hole('P19').x }, { name: 'GND', side: 'top', x: hole('M21').x }],
    }),
    wire(['P19', { x: hole('P19').x, y: MOD_Y }], C.V5),
    wire(['M21', { x: hole('M21').x, y: MOD_Y }], C.GND),

    // WS2812 çubuk
    moduleBox({
      x: 268, y: MOD_Y, w: 164, h: MOD_H, fill: '#111827',
      title: 'WS2812B — 8 LED',
      pads: [{ name: 'DIN', side: 'top', x: hole('a2').x }, { name: 'GND', side: 'top', x: hole('M3').x }, { name: '5V', side: 'top', x: hole('P4').x }],
      extra: stickLeds,
    }),
    route(EX, 300, 200, bottomLane(0), { x: hole('a2').x, y: MOD_Y }, C.D6),
    wire(['M3', { x: hole('M3').x, y: MOD_Y }], C.GND),
    diodeOnWire(hole('P4').x, Y_BOT_PLUS, MOD_Y, C.V5),
    tag(246, bottomLane(0), 'D6', C.D6),
    note(hole('P4').x + 12, (Y_BOT_PLUS + MOD_Y) / 2 + 4, '1N4007 — isteğe bağlı / optional', { cls: 'note-muted' }),

    // Harici adaptör
    moduleBox({
      x: 728, y: MOD_Y, w: 112, h: MOD_H, fill: '#4b5563',
      title: 'Harici 5V 2A', sub: 'external supply',
      pads: [{ name: '−', side: 'top', x: hole('M28').x }, { name: '+', side: 'top', x: hole('P29').x }],
    }),
    wire(['M28', { x: hole('M28').x, y: MOD_Y }], C.GND),
    wire(['P29', { x: hole('P29').x, y: MOD_Y }], C.V5),

    noteAbove('Kartın 5V pini kullanılmaz — modüller harici 5V ile beslenir, GND ortak', BX + 20),
    note(18, MOD_Y + MOD_H + 58, 'The board’s 5V pin is not used — the modules run on the external 5V supply and share GND with the board.', { cls: 'note-muted' }),

    legend([
      { c: C.D5, b: 'D5', t: '→ 10kΩ → transistör bazı / base' },
      { c: C.D6, b: 'D6', t: '→ şerit DIN / strip DIN' },
      { c: C.V5, b: '+ hattı', t: '= harici 5V / external 5V' },
      { c: C.GND, b: '− hattı', t: '= ortak GND / shared GND' },
    ], 18, MOD_Y + MOD_H + 34),
  ].join('\n  ');

  write('07-smart-plug-breadboard.svg', svg({
    title: 'Akilli priz breadboard yerlesimi / Smart plug breadboard layout',
    height: MOD_Y + MOD_H + 72,
    body,
  }));
}

// ═══════════════════ Proje 9 — PIR sensörü (breadboard'suz) ═══════════════════

{
  const pins = [['5V', 140], ['D2', 180], ['GND', 220]];
  const ard = arduino(pins, { h: 200 });
  const EX = ard.edgeX;
  const MX = 430, MY = 96, MW = 220, MH = 176;

  const body = [
    ard.svg,
    moduleBox({
      x: MX, y: MY, w: MW, h: MH, fill: '#2e6fb0',
      pads: [{ name: 'VCC', side: 'left', y: 140 }, { name: 'OUT', side: 'left', y: 180 }, { name: 'GND', side: 'left', y: 220 }],
      extra: [
        `<circle cx="${MX + MW / 2 + 20}" cy="${MY + 62}" r="34" fill="rgba(255,255,255,.88)" stroke="#9ca3af" stroke-width="1.2" />`,
        `<circle cx="${MX + MW / 2 + 20}" cy="${MY + 62}" r="22" fill="none" stroke="#c7ccd1" stroke-width="1" />`,
        `<text class="on-dark" x="${MX + MW / 2 + 20}" y="${MY + 128}" text-anchor="middle" font-size="12">HC-SR501 PIR</text>`,
        `<circle cx="${MX + 60}" cy="${MY + MH - 26}" r="7" fill="#f0932b" stroke="#7c3f00" />`,
        `<circle cx="${MX + MW - 60}" cy="${MY + MH - 26}" r="7" fill="#f0932b" stroke="#7c3f00" />`,
        `<text class="pin-name" x="${MX + 60}" y="${MY + MH - 9}" text-anchor="middle">hassasiyet / sens.</text>`,
        `<text class="pin-name" x="${MX + MW - 60}" y="${MY + MH - 9}" text-anchor="middle">gecikme / delay</text>`,
      ].join(''),
    }),
    wire([{ x: EX, y: 140 }, { x: MX, y: 140 }], C.V5),
    wire([{ x: EX, y: 180 }, { x: MX, y: 180 }], C.D2),
    wire([{ x: EX, y: 220 }, { x: MX, y: 220 }], C.GND),
    tag(310, 140, '5V', C.V5),
    tag(310, 180, 'D2', C.D2),
    tag(310, 220, 'GND', C.GND),
    note(18, 322, 'Çıkışı 3.3V — doğrudan bağlanır, gerilim bölücü GEREKMEZ.'),
    note(18, 342, 'Output is 3.3V — connect it directly, NO voltage divider needed.', { cls: 'note-muted' }),
    note(430, 322, 'Açılıştan sonra 30-60 s ısınma bekle / allow 30-60 s warm-up after power-on', { cls: 'note-muted' }),
  ].join('\n  ');

  write('09-telegram-alert-breadboard.svg', svg({
    title: 'PIR sensoru baglantisi / PIR sensor wiring',
    height: 366,
    body,
  }));
}

// ═══════════════════ Proje 10 — Servo (isteğe bağlı) ═══════════════════

{
  const pins = [['D9', 150], ['GND', 230]];
  const ard = arduino(pins, { h: 200 });
  const EX = ard.edgeX;
  const SX = 430, SY = 106, SW = 150, SH = 144;
  const PX = 430, PY = 300, PW = 150, PH = 70;

  const body = [
    ard.svg,
    // Servo gövdesi + kolu
    moduleBox({
      x: SX, y: SY, w: SW, h: SH, fill: '#2b7cb5',
      title: 'SG90 servo',
      pads: [{ name: 'SİNYAL / SIGNAL', side: 'left', y: 150 }, { name: 'VCC (5V)', side: 'bottom', x: 470 }, { name: 'GND', side: 'bottom', x: 510 }],
      extra: [
        `<rect x="${SX + SW / 2 - 4}" y="${SY - 24}" width="8" height="30" rx="3" fill="#e5e7eb" stroke="#6b7280" />`,
        `<rect x="${SX + SW / 2 - 30}" y="${SY - 30}" width="60" height="9" rx="4.5" fill="#e5e7eb" stroke="#6b7280" />`,
        `<circle cx="${SX + SW / 2}" cy="${SY + 12}" r="9" fill="#111827" />`,
      ].join(''),
    }),
    moduleBox({
      x: PX, y: PY, w: PW, h: PH, fill: '#4b5563',
      title: 'Harici 5V / External 5V', sub: '7. projedeki adaptör',
      pads: [{ name: '+', side: 'top', x: 470 }, { name: '−', side: 'top', x: 510 }, { name: '−', side: 'left', y: PY + 46 }],
    }),
    wire([{ x: EX, y: 150 }, { x: SX, y: 150 }], C.D9),
    wire([{ x: 470, y: PY }, { x: 470, y: SY + SH }], C.V5),
    wire([{ x: 510, y: PY }, { x: 510, y: SY + SH }], C.GND),
    wire([{ x: EX, y: 230 }, { x: 300, y: 230 }, { x: 300, y: PY + 46 }, { x: PX, y: PY + 46 }], C.GND),
    tag(310, 150, 'D9', C.D9),
    tag(360, PY + 46, 'ortak GND / shared GND', C.GND),
    note(18, 402, 'İsteğe bağlı adım. Servoyu kartın 5V pininden DEĞİL, harici adaptörden besle; GND ortak.'),
    note(18, 422, 'Optional step. Power the servo from the external adapter, NOT the board’s 5V pin; share GND.', { cls: 'note-muted' }),
    note(620, 150, 'turuncu/sarı kablo = sinyal', { cls: 'note-muted' }),
    note(620, 168, 'kırmızı = VCC · kahverengi = GND', { cls: 'note-muted' }),
  ].join('\n  ');

  write('10-seeing-assistant-breadboard.svg', svg({
    title: 'Servo baglantisi / Servo wiring',
    height: 446,
    body,
  }));
}

// ═══════════════ Rehber — Breadboard iç bağlantıları ═══════════════

{
  const groups = [];

  for (const col of [5, 11, 17]) {
    const t = hole(`j${col}`), b = hole(`f${col}`);
    groups.push(`<rect class="grp-col" x="${t.x - 7}" y="${t.y - 7}" width="14" height="${b.y - t.y + 14}" rx="7" />`);
  }
  for (const col of [5, 11, 17]) {
    const t = hole(`e${col}`), b = hole(`a${col}`);
    groups.push(`<rect class="grp-col" x="${t.x - 7}" y="${t.y - 7}" width="14" height="${b.y - t.y + 14}" rx="7" />`);
  }

  for (const [row, cls] of [['m', 'minus'], ['p', 'plus'], ['M', 'minus'], ['P', 'plus']]) {
    const a = hole(`${row}1`), b = hole(`${row}29`);
    groups.push(`<rect class="grp-rail ${cls}" x="${a.x - 7.5}" y="${a.y - 7.5}" width="${b.x - a.x + 15}" height="15" rx="7.5" />`);
  }

  const body = [
    `<style>
      .grp-col        { fill: rgba(0,151,157,.22); stroke: #00979d; stroke-width: 1.7; }
      .grp-rail       { fill: rgba(217,74,61,.14); stroke: #d94a3d; stroke-width: 1.7; }
      .grp-rail.minus { fill: rgba(63,127,208,.14); stroke: #3f7fd0; }
    </style>`,
    breadboardBase(),
    groups.join('\n  '),

    badge(1, hole('j5').x - 30, hole('h5').y),
    badge(2, hole('m1').x - 30, hole('m1').y),
    badge(3, hole('f14').x, Y_CHANNEL + 1),

    `<g transform="translate(${BX}, ${BOARD_BOTTOM + 34})">
      <rect x="0" y="-9" width="14" height="14" rx="7" fill="rgba(0,151,157,.22)" stroke="#00979d" stroke-width="1.5" />
      <text class="legend" x="22" y="3">5 delik dikey bağlı / 5 holes connected vertically</text>
      <rect x="330" y="-9" width="14" height="14" rx="7" fill="rgba(217,74,61,.14)" stroke="#d94a3d" stroke-width="1.5" />
      <text class="legend" x="352" y="3">güç hattı boyunca bağlı / whole rail connected</text>
    </g>`,
  ].join('\n  ');

  write('breadboard-baglantilar.svg', svg({
    title: 'Breadboard ic baglantilari / How a breadboard is connected inside',
    height: BOARD_BOTTOM + 60,
    body,
  }));
}
