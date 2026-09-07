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
  /** public/diagrams/ altındaki SVG / SVG under public/diagrams/. */
  diagram?: string;
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
    diagram: '01-traffic-light.svg',
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
    diagram: '02-light-sound-meter.svg',
    bom: [
      { part: 'uno-q', qty: 1, reusedFrom: 1 },
      { part: 'breadboard', qty: 1, reusedFrom: 1 },
      { part: 'jumper-mm', qty: 1, reusedFrom: 1 },
      { part: 'ldr', qty: 1 },
      { part: 'res-10k', qty: 1 },
      { part: 'pot-10k', qty: 1 },
      { part: 'buzzer-passive', qty: 1 },
      { part: 'led-set', qty: 1, reusedFrom: 1 },
      { part: 'res-220', qty: 5 },
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
    diagram: '03-parking-sensor.svg',
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
      { part: 'res-220', qty: 3, reusedFrom: 2 },
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
    diagram: '04-weather-station.svg',
    bom: [
      { part: 'uno-q', qty: 1, reusedFrom: 1 },
      { part: 'breadboard', qty: 1, reusedFrom: 1 },
      { part: 'jumper-mm', qty: 1, reusedFrom: 1 },
      { part: 'jumper-mf', qty: 1 },
      { part: 'dht11', qty: 1 },
      { part: 'oled-ssd1306', qty: 1 },
      { part: 'res-10k', qty: 1, reusedFrom: 1 },
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
    diagram: '05-data-logger.svg',
    bom: [
      { part: 'uno-q', qty: 1, reusedFrom: 1 },
      { part: 'breadboard', qty: 1, reusedFrom: 1 },
      { part: 'jumper-mm', qty: 1, reusedFrom: 1 },
      { part: 'dht11', qty: 1, reusedFrom: 4 },
      { part: 'ldr', qty: 1, reusedFrom: 2 },
      { part: 'res-10k', qty: 2, reusedFrom: 1 },
    ],
  },
  {
    id: 'web-matrix',
    number: 6,
    slug: { tr: 'webden-yazi-yazma', en: 'write-from-the-web' },
    category: 'wifi',
    difficulty: 'intermediate',
    durationMin: 45,
    needsInternet: false,
    needsCamera: false,
    needsMic: false,
    bricks: ['arduino:web_ui'],
    codeFiles: ['app.yaml', 'main.py', 'sketch.ino', 'index.html', 'app.js'],
    diagram: '06-web-matrix.svg',
    bom: [
      { part: 'uno-q', qty: 1, reusedFrom: 1 },
      { part: 'usb-c-cable', qty: 1, reusedFrom: 1 },
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
    codeFiles: ['app.yaml', 'main.py', 'sketch.ino', 'sketch.yaml', 'index.html', 'app.js'],
    diagram: '07-smart-plug.svg',
    voltageWarning: true,
    bom: [
      { part: 'uno-q', qty: 1, reusedFrom: 1 },
      { part: 'breadboard', qty: 1, reusedFrom: 1 },
      { part: 'jumper-mm', qty: 1, reusedFrom: 1 },
      { part: 'relay-1ch', qty: 1 },
      { part: 'ws2812-8', qty: 1 },
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
    codeFiles: ['app.yaml', 'main.py', 'sketch.ino', 'sketch.yaml', 'index.html', 'app.js'],
    diagram: '08-live-dashboard.svg',
    bom: [
      { part: 'uno-q', qty: 1, reusedFrom: 1 },
      { part: 'breadboard', qty: 1, reusedFrom: 1 },
      { part: 'jumper-mm', qty: 1, reusedFrom: 1 },
      { part: 'dht11', qty: 1, reusedFrom: 4 },
      { part: 'ldr', qty: 1, reusedFrom: 2 },
      { part: 'res-10k', qty: 2, reusedFrom: 1 },
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
    diagram: '09-telegram-alert.svg',
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
      'arduino:object_detection',
      'arduino:asr',
      'arduino:tts',
      'arduino:web_ui',
    ],
    codeFiles: ['app.yaml', 'main.py', 'sketch.ino', 'index.html', 'app.js'],
    diagram: '10-seeing-assistant.svg',
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
