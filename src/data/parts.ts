/**
 * Malzeme kataloğu / Parts catalogue.
 *
 * TEK KAYNAK: Bir malzemenin adı, fiyatı veya voltaj notu burada değişir,
 * tüm projelerde ve her iki dilde birden güncellenir.
 * SINGLE SOURCE: change a part here and every project, in both languages, updates.
 */

export type PartCategory = 'core' | 'passive' | 'sensor' | 'output' | 'ai';

/**
 * 3.3V uyumluluk durumu — malzeme tablosunda renkli rozet olarak gösterilir.
 * 3.3V compatibility, rendered as a coloured badge in the parts table.
 *
 *  safe     : doğrudan bağlanır / connect directly
 *  caution  : çalışır ama dikkat gerekir / works, but needs care
 *  danger   : ek devre olmadan bağlanırsa kartı bozabilir / can damage the board as-is
 */
export type VoltageRisk = 'safe' | 'caution' | 'danger';

export interface Part {
  id: string;
  name: { tr: string; en: string };
  category: PartCategory;
  voltageRisk: VoltageRisk;
  /** 3.3V ile ilgili kısa açıklama / Short note about 3.3V behaviour. */
  voltageNote?: { tr: string; en: string };
}

const partsCatalogue = {
  // ───────────────────────── Ana kart ve temel ekipman ─────────────────────────
  'uno-q': {
    id: 'uno-q',
    name: { tr: 'Arduino UNO Q (4 GB)', en: 'Arduino UNO Q (4 GB)' },
    category: 'core',
    voltageRisk: 'safe',
    voltageNote: {
      tr: 'Kartın tüm GPIO pinleri 3.3V lojik ile çalışır.',
      en: 'Every GPIO pin on the board runs at 3.3V logic.',
    },
  },
  'usb-c-cable': {
    id: 'usb-c-cable',
    name: { tr: 'USB-C kablo (veri destekli)', en: 'USB-C cable (data capable)' },
    category: 'core',
    voltageRisk: 'safe',
    voltageNote: {
      tr: 'Sadece şarj eden kablolar veri taşımaz — mutlaka veri destekli olmalı.',
      en: 'Charge-only cables carry no data — make sure yours supports data.',
    },
  },
  breadboard: {
    id: 'breadboard',
    name: { tr: 'Breadboard (830 delik)', en: 'Breadboard (830 tie points)' },
    category: 'core',
    voltageRisk: 'safe',
  },
  'jumper-mm': {
    id: 'jumper-mm',
    name: { tr: 'Jumper kablo erkek-erkek (40 adet)', en: 'Jumper wires male-male (40 pcs)' },
    category: 'core',
    voltageRisk: 'safe',
  },
  'jumper-mf': {
    id: 'jumper-mf',
    name: { tr: 'Jumper kablo erkek-dişi (40 adet)', en: 'Jumper wires male-female (40 pcs)' },
    category: 'core',
    voltageRisk: 'safe',
  },
  multimeter: {
    id: 'multimeter',
    name: { tr: 'Dijital multimetre', en: 'Digital multimeter' },
    category: 'core',
    voltageRisk: 'safe',
    voltageNote: {
      tr: 'Gerilim bölücüyü doğrulamak için gerçekten işe yarar — 3. projede kullanacağız.',
      en: 'Genuinely useful for verifying the voltage divider — we use it in project 3.',
    },
  },
  'psu-5v': {
    id: 'psu-5v',
    name: { tr: '5V 2A adaptör + klemens', en: '5V 2A power supply + screw terminal' },
    category: 'core',
    voltageRisk: 'safe',
    voltageNote: {
      tr: 'Servo, röle ve LED şerit için ayrı besleme. GND mutlaka kartla ortaklanmalı.',
      en: 'Separate supply for servo, relay and LED strip. Its GND must be tied to the board GND.',
    },
  },

  // ───────────────────────── Pasif bileşenler ─────────────────────────
  'led-set': {
    id: 'led-set',
    name: { tr: '5 mm LED seti (kırmızı/sarı/yeşil)', en: '5 mm LED set (red/yellow/green)' },
    category: 'passive',
    voltageRisk: 'safe',
  },
  'res-220': {
    id: 'res-220',
    name: { tr: '220 Ω direnç', en: '220 Ω resistor' },
    category: 'passive',
    voltageRisk: 'safe',
    voltageNote: {
      tr: 'LED akım sınırlama. 3.3V ile 220 Ω yaklaşık 6 mA verir — yeterli parlaklık.',
      en: 'LED current limiting. At 3.3V, 220 Ω gives about 6 mA — plenty bright.',
    },
  },
  'res-2k2': {
    id: 'res-2k2',
    name: { tr: '2.2 kΩ direnç', en: '2.2 kΩ resistor' },
    category: 'passive',
    voltageRisk: 'safe',
    voltageNote: {
      tr: 'HC-SR04 gerilim bölücüsünün üst kolu (R1).',
      en: 'Upper leg (R1) of the HC-SR04 voltage divider.',
    },
  },
  'res-3k3': {
    id: 'res-3k3',
    name: { tr: '3.3 kΩ direnç', en: '3.3 kΩ resistor' },
    category: 'passive',
    voltageRisk: 'safe',
    voltageNote: {
      tr: 'HC-SR04 gerilim bölücüsünün alt kolu (R2). 5V girişi 3.0V çıkışa indirir.',
      en: 'Lower leg (R2) of the HC-SR04 divider. Turns a 5V input into a 3.0V output.',
    },
  },
  'res-10k': {
    id: 'res-10k',
    name: { tr: '10 kΩ direnç', en: '10 kΩ resistor' },
    category: 'passive',
    voltageRisk: 'safe',
    voltageNote: {
      tr: 'Buton pull-down ve DHT11 pull-up için.',
      en: 'Button pull-down and DHT11 pull-up.',
    },
  },
  'pot-10k': {
    id: 'pot-10k',
    name: { tr: '10 kΩ potansiyometre', en: '10 kΩ potentiometer' },
    category: 'passive',
    voltageRisk: 'safe',
    voltageNote: {
      tr: 'Uç bacaklarını 3.3V ve GND’ye bağla — 5V’ye DEĞİL. Orta bacak analog girişe.',
      en: 'Wire the outer legs to 3.3V and GND — NOT 5V. Middle leg goes to the analog input.',
    },
  },
  button: {
    id: 'button',
    name: { tr: 'Tact buton 6x6 mm (10 adet)', en: 'Tactile button 6x6 mm (10 pcs)' },
    category: 'passive',
    voltageRisk: 'safe',
  },
  '2n2222': {
    id: '2n2222',
    name: { tr: '2N2222 NPN transistör (10 adet)', en: '2N2222 NPN transistor (10 pcs)' },
    category: 'passive',
    voltageRisk: 'safe',
    voltageNote: {
      tr: '3.3V sinyalle 5V röleyi sürmek için. Kartı röleden elektriksel olarak ayırır.',
      en: 'Lets a 3.3V signal drive a 5V relay, keeping the board isolated from it.',
    },
  },
  'diode-1n4007': {
    id: 'diode-1n4007',
    name: { tr: '1N4007 diyot', en: '1N4007 diode' },
    category: 'passive',
    voltageRisk: 'safe',
    voltageNote: {
      tr: 'WS2812 şeridin 5V beslemesine seri bağlanır; ~0.7V düşürüp şeridi 4.3V’ta çalıştırır. Böylece 3.3V veri sinyali güvenli sınıra girer.',
      en: 'Goes in series with the WS2812 strip’s 5V feed; drops ~0.7V so the strip runs at 4.3V, bringing the 3.3V data signal within spec.',
    },
  },

  // ───────────────────────── Sensörler ─────────────────────────
  ldr: {
    id: 'ldr',
    name: { tr: 'LDR foto direnç (5 adet)', en: 'LDR photoresistor (5 pcs)' },
    category: 'sensor',
    voltageRisk: 'safe',
    voltageNote: {
      tr: '10 kΩ ile gerilim bölücü kurulur, çıkışı 3.3V’yi aşmaz. 3 bacaklı ışık sensörü kartı da olur: 3V3 ile besle, AO/S pinini kullan.',
      en: 'Forms a divider with a 10 kΩ resistor; its output never exceeds 3.3V. A 3-pin light sensor module works too: power it from 3V3 and use its AO/S pin.',
    },
  },
  dht11: {
    id: 'dht11',
    name: { tr: 'DHT11 sıcaklık ve nem sensörü', en: 'DHT11 temperature & humidity sensor' },
    category: 'sensor',
    voltageRisk: 'safe',
    voltageNote: {
      tr: '3.3V ile beslendiğinde veri hattı da 3.3V olur — güvenli.',
      en: 'Powered from 3.3V, its data line is 3.3V too — safe.',
    },
  },
  'hc-sr04': {
    id: 'hc-sr04',
    name: { tr: 'HC-SR04 ultrasonik mesafe sensörü', en: 'HC-SR04 ultrasonic distance sensor' },
    category: 'sensor',
    voltageRisk: 'danger',
    voltageNote: {
      tr: 'ECHO pini 5V verir ve 3.3V girişi bozabilir. Gerilim bölücü ZORUNLU.',
      en: 'Its ECHO pin outputs 5V and can damage a 3.3V input. A voltage divider is MANDATORY.',
    },
  },
  'pir-hcsr501': {
    id: 'pir-hcsr501',
    name: { tr: 'HC-SR501 PIR hareket sensörü', en: 'HC-SR501 PIR motion sensor' },
    category: 'sensor',
    voltageRisk: 'safe',
    voltageNote: {
      tr: '5V ile beslenir ama çıkışı 3.3V TTL’dir — doğrudan bağlanabilir.',
      en: 'Runs on 5V but its output is 3.3V TTL — safe to connect directly.',
    },
  },

  // ───────────────────────── Çıkış birimleri ─────────────────────────
  'buzzer-passive': {
    id: 'buzzer-passive',
    name: { tr: 'Pasif buzzer', en: 'Passive buzzer' },
    category: 'output',
    voltageRisk: 'safe',
    voltageNote: {
      tr: 'Pasif olmalı — aktif buzzer tek ton çalar, melodi üretemez. Pin akımını sınırlamak için araya seri 220 Ω koy. 3 bacaklı buzzer kartı da olur (ör. KY-006): VCC’yi 3V3’e bağla.',
      en: 'Must be passive — an active buzzer plays one fixed tone and cannot make melodies. Put a 220 Ω resistor in series to limit the pin current. A 3-pin buzzer module (e.g. KY-006) works too: power its VCC from 3V3.',
    },
  },
  'oled-ssd1306': {
    id: 'oled-ssd1306',
    name: { tr: '0.96" SSD1306 I2C OLED ekran', en: '0.96" SSD1306 I2C OLED display' },
    category: 'output',
    voltageRisk: 'safe',
    voltageNote: {
      tr: 'Doğal olarak 3.3V çalışır — I2C LCD’nin aksine seviye çevirici gerekmez.',
      en: 'Natively 3.3V — unlike an I2C LCD it needs no level shifter.',
    },
  },
  'ws2812-8': {
    id: 'ws2812-8',
    name: { tr: 'WS2812B RGB LED çubuk (8 LED)', en: 'WS2812B RGB LED stick (8 LEDs)' },
    category: 'output',
    voltageRisk: 'caution',
    voltageNote: {
      tr: 'Veri girişi resmî olarak 3.5V ister; 3.3V sınırda kalır ve 8 LED’lik çubukta genelde çalışır. Çalışmazsa şeridin 5V hattına seri 1N4007 diyot koy. Uzun şeritlerde seviye çevirici gerekir.',
      en: 'The data input officially wants 3.5V; 3.3V is borderline and usually works on an 8-LED stick. If it does not, put a 1N4007 diode in series with the strip’s 5V feed. Longer strips need a level shifter.',
    },
  },
  'relay-1ch': {
    id: 'relay-1ch',
    name: { tr: '1 kanal optokuplörlü röle modülü', en: '1-channel opto-isolated relay module' },
    category: 'output',
    voltageRisk: 'caution',
    voltageNote: {
      tr: '3.3V ile her zaman tetiklenmez; 2N2222 ile sürüyoruz. Şebeke gerilimine BAĞLAMA.',
      en: 'Not always reliable at 3.3V, so we drive it with a 2N2222. Do NOT wire it to mains.',
    },
  },
  'servo-sg90': {
    id: 'servo-sg90',
    name: { tr: 'SG90 mikro servo motor', en: 'SG90 micro servo motor' },
    category: 'output',
    voltageRisk: 'caution',
    voltageNote: {
      tr: 'Sinyal 3.3V ile çalışır ama gücünü harici 5V’den al — kartın 5V pini yetmez.',
      en: 'The 3.3V signal works, but power it from an external 5V supply — the board’s 5V pin cannot keep up.',
    },
  },

  // ───────────────────────── Kamera ve ses ─────────────────────────
  'usb-camera': {
    id: 'usb-camera',
    name: { tr: 'USB webcam (1080p, UVC uyumlu)', en: 'USB webcam (1080p, UVC compliant)' },
    category: 'ai',
    voltageRisk: 'safe',
    voltageNote: {
      tr: 'UVC standardına uygun olmalı — Linux sürücüsüz tanır.',
      en: 'Must be UVC compliant so Linux recognises it without extra drivers.',
    },
  },
  'usb-mic': {
    id: 'usb-mic',
    name: { tr: 'USB mikrofon', en: 'USB microphone' },
    category: 'ai',
    voltageRisk: 'safe',
  },
  speaker: {
    id: 'speaker',
    name: { tr: 'USB hoparlör', en: 'USB speaker' },
    category: 'ai',
    voltageRisk: 'safe',
    voltageNote: {
      tr: 'Kartta 3.5 mm ses jakı yok. USB ses cihazı gerekir — ya USB hoparlör ya da USB ses kartı + sıradan hoparlör.',
      en: 'The board has no 3.5 mm audio jack. You need a USB audio device — either a USB speaker or a USB sound card plus an ordinary speaker.',
    },
  },
  'usb-hub': {
    id: 'usb-hub',
    name: { tr: 'PD güç girişli USB-C hub (power passthrough)', en: 'USB-C hub with PD power passthrough' },
    category: 'ai',
    voltageRisk: 'safe',
    voltageNote: {
      tr: 'Kartta tek USB-C portu var ve o da güç için kullanılıyor. Hub’ın kendi USB-C güç girişi (PD) olmalı ve bu gücü karta geçirmeli; 5 V / 3 A adaptör kullan. Sıradan “harici beslemeli USB-A hub” kartı beslemez; Apple hub’lar çalışmaz.',
      en: 'The board has a single USB-C port, also used for power. The hub needs its own USB-C power input (PD) and must pass that power through to the board; use a 5 V / 3 A adapter. An ordinary powered USB-A hub does not power the board, and Apple hubs do not work.',
    },
  },
} as const satisfies Record<string, Part>;

/** Anahtarlar birebir korunur, değerler Part olarak genişletilir. */
export type PartId = keyof typeof partsCatalogue;
export const parts: Record<PartId, Part> = partsCatalogue;

export function getPart(id: PartId): Part {
  return parts[id];
}

export const partCategoryOrder: PartCategory[] = ['core', 'passive', 'sensor', 'output', 'ai'];
