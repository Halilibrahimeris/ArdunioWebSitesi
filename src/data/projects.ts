/**
 * Proje meta verisi / Project metadata.
 *
 * Dilden bağımsız her şey burada: sıra, zorluk, malzeme, brickler, kod dosyaları.
 * Markdown dosyaları yalnızca anlatım metnini taşır.
 *
 * Everything language-independent lives here: order, difficulty, parts, bricks, code files.
 * The Markdown files carry only the prose.
 */

import type { PartId } from './parts';

export type Category = 'offline' | 'bridge' | 'wifi' | 'ai';
export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

export interface BomLine {
  part: PartId;
  qty: number;
  /** Zorunlu değil / Not required to complete the project. */
  optional?: boolean;
  /** Bu malzeme kaçıncı projede zaten alındı? / Which project already covered this purchase. */
  reusedFrom?: number;
  note?: { tr: string; en: string };
}

/** Şemada okurun seçebildiği bir parça / A part the reader can pick in the wiring diagram. */
export interface DiagramChoice {
  /** Dosya adında ve tarayıcıda hatırlanan seçimde kullanılır / Used in file names and the remembered choice. */
  id: string;
  label: { tr: string; en: string };
  /** İlki varsayılan şemadır / The first one is the default diagram. */
  options: { id: string; label: { tr: string; en: string } }[];
}

/** Seçimlerin bir birleşimine ait şema / The diagram for one combination of picks. */
export interface DiagramVariant {
  file: string;
  /** Seçim kimliği → seçenek kimliği / Choice id → option id. */
  when: Record<string, string>;
}

export interface DiagramPicker {
  choices: DiagramChoice[];
  variants: DiagramVariant[];
}

/** Hem çıplak hem 3 bacaklı kart olarak satılan parçalar / Parts sold both bare and on a 3-pin module. */
const PART_CHOICES = {
  dht: {
    id: 'dht',
    label: { tr: 'DHT11', en: 'DHT11' },
    options: [
      { id: 'bare', label: { tr: '4 bacaklı sensör + 10kΩ', en: '4-pin sensor + 10kΩ' } },
      { id: 'module', label: { tr: '3 bacaklı kart', en: '3-pin module' } },
    ],
  },
  light: {
    id: 'light',
    label: { tr: 'Işık sensörü', en: 'Light sensor' },
    options: [
      { id: 'ldr', label: { tr: 'Çıplak LDR + 10kΩ', en: 'Bare LDR + 10kΩ' } },
      { id: 'module', label: { tr: '3 bacaklı kart', en: '3-pin module' } },
    ],
  },
  buzzer: {
    id: 'buzzer',
    label: { tr: 'Buzzer', en: 'Buzzer' },
    options: [
      { id: 'bare', label: { tr: 'Çıplak buzzer', en: 'Bare buzzer' } },
      { id: 'module', label: { tr: '3 bacaklı kart', en: '3-pin module' } },
    ],
  },
} satisfies Record<string, DiagramChoice>;

/**
 * Seçimlerin her birleşimi için bir şema. Varsayılan dışındaki her seçim dosya adına
 * eklenir, ör. 02-light-sound-meter-light-module-buzzer-module-breadboard.svg.
 * gen-breadboard.mjs'teki variantFile() aynı kuralla yazar.
 */
function picker(base: string, ...choices: DiagramChoice[]): DiagramPicker {
  let combos: Record<string, string>[] = [{}];
  for (const choice of choices) {
    combos = combos.flatMap((combo) => choice.options.map((option) => ({ ...combo, [choice.id]: option.id })));
  }
  return {
    choices,
    variants: combos.map((when) => ({
      when,
      file: `${base}${choices
        .filter((choice) => when[choice.id] !== choice.options[0].id)
        .map((choice) => `-${choice.id}-${when[choice.id]}`)
        .join('')}-breadboard.svg`,
    })),
  };
}

export interface Project {
  id: string;
  /** Sitede görünen sıra numarası / Display number, 1-10. */
  number: number;
  slug: { tr: string; en: string };
  category: Category;
  difficulty: Difficulty;
  /** Tahmini süre, dakika / Estimated build time in minutes. */
  durationMin: number;
  needsInternet: boolean;
  needsCamera: boolean;
  needsMic: boolean;
  /** Kullanılan App Lab brickleri / App Lab bricks used. */
  bricks: string[];
  bom: BomLine[];
  /** src/code/<id>/<lang>/ altındaki dosyalar / Files under src/code/<id>/<lang>/. */
  codeFiles: string[];
  /** src/diagrams/ altındaki bağlantı şeması; donanımı olmayan projede yok / Wiring SVG under src/diagrams/, absent when there is no hardware. */
  diagram?: string;
  /** Varsa şema bölümünde parça seçenekleri çıkar / When set, the wiring section lets the reader pick part variants. */
  diagramPicker?: DiagramPicker;
  /** 3.3V uyarısı gösterilsin mi / Whether to surface the 3.3V warning. */
  voltageWarning?: boolean;
}

export const projects: Project[] = [
  {
    id: 'traffic-light',
    number: 1,
    slug: { tr: 'trafik-lambasi', en: 'traffic-light' },
    category: 'offline',
    difficulty: 'beginner',
    durationMin: 30,
    needsInternet: false,
    needsCamera: false,
    needsMic: false,
    bricks: [],
    codeFiles: ['sketch.ino'],
    diagram: '01-traffic-light-breadboard.svg',
    bom: [
      { part: 'uno-q', qty: 1 },
      { part: 'usb-c-cable', qty: 1 },
      { part: 'breadboard', qty: 1 },
      { part: 'jumper-mm', qty: 1 },
      { part: 'led-set', qty: 1 },
      { part: 'res-220', qty: 3 },
      { part: 'button', qty: 1 },
      { part: 'res-10k', qty: 1 },
    ],
  },
  {
    id: 'light-sound-meter',
    number: 2,
    slug: { tr: 'isik-ve-ses-olcer', en: 'light-and-sound-meter' },
    category: 'offline',
    difficulty: 'beginner',
    durationMin: 40,
    needsInternet: false,
    needsCamera: false,
    needsMic: false,
    bricks: [],
    codeFiles: ['sketch.ino'],
    diagram: '02-light-sound-meter-breadboard.svg',
    diagramPicker: picker('02-light-sound-meter', PART_CHOICES.light, PART_CHOICES.buzzer),
    bom: [
      { part: 'uno-q', qty: 1, reusedFrom: 1 },
      { part: 'breadboard', qty: 1, reusedFrom: 1 },
      { part: 'jumper-mm', qty: 1, reusedFrom: 1 },
      { part: 'ldr', qty: 1 },
      {
        part: 'res-10k',
        qty: 1,
        note: {
          tr: 'LDR gerilim bölücüsü için. 3 bacaklı ışık sensörü kartı kullanıyorsan gerekmez — direnç kartın üstünde.',
          en: 'For the LDR voltage divider. Not needed with a 3-pin light sensor module — the resistor is on the module.',
        },
      },
      { part: 'pot-10k', qty: 1 },
      { part: 'buzzer-passive', qty: 1 },
      { part: 'led-set', qty: 1, reusedFrom: 1 },
      { part: 'res-220', qty: 6 },
    ],
  },
  {
    id: 'parking-sensor',
    number: 3,
    slug: { tr: 'park-sensoru', en: 'parking-sensor' },
    category: 'offline',
    difficulty: 'intermediate',
    durationMin: 50,
    needsInternet: false,
    needsCamera: false,
    needsMic: false,
    bricks: [],
    codeFiles: ['sketch.ino'],
    diagram: '03-parking-sensor-breadboard.svg',
    diagramPicker: picker('03-parking-sensor', PART_CHOICES.buzzer),
    voltageWarning: true,
    bom: [
      { part: 'uno-q', qty: 1, reusedFrom: 1 },
      { part: 'breadboard', qty: 1, reusedFrom: 1 },
      { part: 'jumper-mm', qty: 1, reusedFrom: 1 },
      { part: 'hc-sr04', qty: 1 },
      {
        part: 'res-2k2',
        qty: 1,
        note: {
          tr: 'Gerilim bölücünün üst kolu — atlanamaz.',
          en: 'Upper leg of the divider — not optional.',
        },
      },
      {
        part: 'res-3k3',
        qty: 1,
        note: {
          tr: 'Gerilim bölücünün alt kolu — atlanamaz.',
          en: 'Lower leg of the divider — not optional.',
        },
      },
      { part: 'buzzer-passive', qty: 1, reusedFrom: 2 },
      { part: 'led-set', qty: 1, reusedFrom: 1 },
      { part: 'res-220', qty: 4, reusedFrom: 2 },
      {
        part: 'multimeter',
        qty: 1,
        optional: true,
        note: {
          tr: 'Bölücü çıkışını ölçüp 3.3V altında olduğunu doğrulamak için.',
          en: 'To measure the divider output and confirm it stays under 3.3V.',
        },
      },
    ],
  },
  {
    id: 'weather-station',
    number: 4,
    slug: { tr: 'oled-hava-istasyonu', en: 'oled-weather-station' },
    category: 'offline',
    difficulty: 'intermediate',
    durationMin: 50,
    needsInternet: false,
    needsCamera: false,
    needsMic: false,
    bricks: [],
    codeFiles: ['sketch.ino', 'sketch.yaml'],
    diagram: '04-weather-station-breadboard.svg',
    diagramPicker: picker('04-weather-station', PART_CHOICES.dht),
    bom: [
      { part: 'uno-q', qty: 1, reusedFrom: 1 },
      { part: 'breadboard', qty: 1, reusedFrom: 1 },
      { part: 'jumper-mm', qty: 1, reusedFrom: 1 },
      { part: 'jumper-mf', qty: 1 },
      { part: 'dht11', qty: 1 },
      { part: 'oled-ssd1306', qty: 1 },
      {
        part: 'res-10k',
        qty: 1,
        reusedFrom: 1,
        note: {
          tr: 'DHT11 pull-up’ı için. 3 bacaklı DHT11 kartında direnç hazır, gerekmez.',
          en: 'DHT11 pull-up. Not needed with a 3-pin DHT11 module — it has one on board.',
        },
      },
    ],
  },
  {
    id: 'data-logger',
    number: 5,
    slug: { tr: 'veri-kaydedici', en: 'data-logger' },
    category: 'bridge',
    difficulty: 'intermediate',
    durationMin: 60,
    needsInternet: false,
    needsCamera: false,
    needsMic: false,
    bricks: ['arduino:dbstorage_tsstore'],
    codeFiles: ['app.yaml', 'main.py', 'sketch.ino'],
    diagram: '05-data-logger-breadboard.svg',
    diagramPicker: picker('05-data-logger', PART_CHOICES.dht, PART_CHOICES.light),
    bom: [
      { part: 'uno-q', qty: 1, reusedFrom: 1 },
      { part: 'breadboard', qty: 1, reusedFrom: 1 },
      { part: 'jumper-mm', qty: 1, reusedFrom: 1 },
      { part: 'dht11', qty: 1, reusedFrom: 4 },
      { part: 'ldr', qty: 1, reusedFrom: 2 },
      {
        part: 'res-10k',
        qty: 2,
        reusedFrom: 1,
        note: {
          tr: 'Biri DHT11 pull-up’ı, biri LDR bölücüsü için. 3 bacaklı DHT11 kartı ya da ışık sensörü kartı kullanıyorsan her kart için 1 adet eksilt.',
          en: 'One for the DHT11 pull-up, one for the LDR divider. Drop one for each 3-pin module (DHT11 or light sensor) you use.',
        },
      },
    ],
  },
  {
    id: 'distance-game',
    number: 6,
    slug: { tr: 'mesafe-oyunu', en: 'distance-game' },
    category: 'wifi',
    difficulty: 'intermediate',
    durationMin: 70,
    needsInternet: false,
    needsCamera: false,
    needsMic: false,
    bricks: ['arduino:web_ui'],
    codeFiles: ['app.yaml', 'main.py', 'sketch.ino', 'index.html', 'app.js', 'style.css'],
    diagram: '06-distance-game-breadboard.svg',
    diagramPicker: picker('06-distance-game', PART_CHOICES.buzzer),
    voltageWarning: true,
    bom: [
      { part: 'uno-q', qty: 1, reusedFrom: 1 },
      { part: 'breadboard', qty: 1, reusedFrom: 1 },
      { part: 'jumper-mm', qty: 1, reusedFrom: 1 },
      {
        part: 'hc-sr04',
        qty: 1,
        reusedFrom: 3,
        note: {
          tr: 'Devre 3. projeyle birebir aynı — kurduğun düzeneği bozmadıysan hiçbir şeye dokunma.',
          en: 'The circuit is identical to project 3 — if you kept that build, do not touch a thing.',
        },
      },
      { part: 'res-2k2', qty: 1, reusedFrom: 3 },
      { part: 'res-3k3', qty: 1, reusedFrom: 3 },
      { part: 'buzzer-passive', qty: 1, reusedFrom: 2 },
      { part: 'led-set', qty: 1, reusedFrom: 1 },
      { part: 'res-220', qty: 4, reusedFrom: 2 },
      {
        part: 'multimeter',
        qty: 1,
        optional: true,
        reusedFrom: 3,
        note: {
          tr: 'Devreyi yeniden kuruyorsan bölücü çıkışını bir daha ölç.',
          en: 'Measure the divider output again if you are rebuilding the circuit.',
        },
      },
    ],
  },
  {
    id: 'smart-plug',
    number: 7,
    slug: { tr: 'akilli-priz', en: 'smart-plug' },
    category: 'wifi',
    difficulty: 'intermediate',
    durationMin: 60,
    needsInternet: false,
    needsCamera: false,
    needsMic: false,
    bricks: ['arduino:web_ui'],
    codeFiles: ['app.yaml', 'main.py', 'sketch.ino', 'sketch.yaml', 'index.html', 'app.js', 'style.css'],
    diagram: '07-smart-plug-breadboard.svg',
    voltageWarning: true,
    bom: [
      { part: 'uno-q', qty: 1, reusedFrom: 1 },
      { part: 'breadboard', qty: 1, reusedFrom: 1 },
      { part: 'jumper-mm', qty: 1, reusedFrom: 1 },
      { part: 'relay-1ch', qty: 1 },
      { part: 'ws2812-8', qty: 1 },
      {
        part: 'diode-1n4007',
        qty: 1,
        optional: true,
        note: {
          tr: 'Şerit 3.3V veriyle titrer ya da yanmazsa 5V hattına seri tak.',
          en: 'Fit it in series with the 5V feed if the strip flickers or stays dark on 3.3V data.',
        },
      },
      { part: '2n2222', qty: 1 },
      { part: 'res-10k', qty: 1, reusedFrom: 1 },
      { part: 'psu-5v', qty: 1 },
    ],
  },
  {
    id: 'live-dashboard',
    number: 8,
    slug: { tr: 'canli-panel', en: 'live-dashboard' },
    category: 'wifi',
    difficulty: 'intermediate',
    durationMin: 70,
    needsInternet: false,
    needsCamera: false,
    needsMic: false,
    bricks: ['arduino:web_ui', 'arduino:dbstorage_tsstore'],
    codeFiles: ['app.yaml', 'main.py', 'sketch.ino', 'sketch.yaml', 'index.html', 'app.js', 'style.css'],
    diagram: '08-live-dashboard-breadboard.svg',
    diagramPicker: picker('08-live-dashboard', PART_CHOICES.dht, PART_CHOICES.light),
    bom: [
      { part: 'uno-q', qty: 1, reusedFrom: 1 },
      { part: 'breadboard', qty: 1, reusedFrom: 1 },
      { part: 'jumper-mm', qty: 1, reusedFrom: 1 },
      { part: 'dht11', qty: 1, reusedFrom: 4 },
      { part: 'ldr', qty: 1, reusedFrom: 2 },
      {
        part: 'res-10k',
        qty: 2,
        reusedFrom: 1,
        note: {
          tr: 'Biri DHT11 pull-up’ı, biri LDR bölücüsü için. 3 bacaklı DHT11 kartı ya da ışık sensörü kartı kullanıyorsan her kart için 1 adet eksilt.',
          en: 'One for the DHT11 pull-up, one for the LDR divider. Drop one for each 3-pin module (DHT11 or light sensor) you use.',
        },
      },
    ],
  },
  {
    id: 'telegram-alert',
    number: 9,
    slug: { tr: 'telegram-botu', en: 'telegram-bot' },
    category: 'wifi',
    difficulty: 'intermediate',
    durationMin: 50,
    needsInternet: true,
    needsCamera: false,
    needsMic: false,
    bricks: ['arduino:telegram_bot', 'arduino:weather_forecast'],
    codeFiles: ['app.yaml', 'main.py', 'sketch.ino'],
    diagram: '09-telegram-alert-breadboard.svg',
    bom: [
      { part: 'uno-q', qty: 1, reusedFrom: 1 },
      { part: 'breadboard', qty: 1, reusedFrom: 1 },
      { part: 'jumper-mf', qty: 1, reusedFrom: 4 },
      { part: 'pir-hcsr501', qty: 1 },
    ],
  },
  {
    id: 'seeing-assistant',
    number: 10,
    slug: { tr: 'goren-ve-konusan-asistan', en: 'seeing-speaking-assistant' },
    category: 'ai',
    difficulty: 'advanced',
    durationMin: 80,
    needsInternet: false,
    needsCamera: true,
    needsMic: true,
    bricks: [
      'arduino:video_object_detection',
      'arduino:asr',
      'arduino:tts',
      'arduino:web_ui',
    ],
    codeFiles: ['app.yaml', 'main.py', 'sketch.ino', 'sketch.yaml', 'index.html', 'app.js', 'style.css'],
    diagram: '10-seeing-assistant-breadboard.svg',
    bom: [
      { part: 'uno-q', qty: 1, reusedFrom: 1 },
      { part: 'usb-hub', qty: 1 },
      { part: 'usb-camera', qty: 1 },
      { part: 'usb-mic', qty: 1 },
      { part: 'speaker', qty: 1 },
      {
        part: 'servo-sg90',
        qty: 1,
        optional: true,
        note: {
          tr: 'Kameranın tespit edilen nesneyi takip etmesi için.',
          en: 'Lets the camera pan to follow the detected object.',
        },
      },
      { part: 'psu-5v', qty: 1, reusedFrom: 7, optional: true },
    ],
  },
];

// ───────────────────────── Yardımcılar / Helpers ─────────────────────────

export function getProjectBySlug(lang: 'tr' | 'en', slug: string): Project | undefined {
  return projects.find((p) => p.slug[lang] === slug);
}

export function getProjectById(id: string): Project | undefined {
  return projects.find((p) => p.id === id);
}

/** Sıradaki ve önceki proje / Neighbouring projects for prev/next navigation. */
export function getNeighbours(number: number) {
  return {
    prev: projects.find((p) => p.number === number - 1),
    next: projects.find((p) => p.number === number + 1),
  };
}

/** Bir malzemenin kullanıldığı projeler / Projects that use a given part. */
export function projectsUsingPart(partId: PartId): Project[] {
  return projects.filter((p) => p.bom.some((line) => line.part === partId));
}

export const categories: Category[] = ['offline', 'bridge', 'wifi', 'ai'];
export const difficulties: Difficulty[] = ['beginner', 'intermediate', 'advanced'];
