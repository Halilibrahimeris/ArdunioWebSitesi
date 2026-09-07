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

  // ───────────────────────── Sensörler ─────────────────────────
  ldr: {
    id: 'ldr',
    name: { tr: 'LDR foto direnç (5 adet)', en: 'LDR photoresistor (5 pcs)' },
    category: 'sensor',
    voltageRisk: 'safe',
    voltageNote: {
      tr: '10 kΩ ile gerilim bölücü kurulur, çıkışı 3.3V’yi aşmaz.',
      en: 'Forms a divider with a 10 kΩ resistor; its output never exceeds 3.3V.',
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
      tr: 'Pasif olmalı — aktif buzzer tek ton çalar, melodi üretemez.',
      en: 'Must be passive — an active buzzer plays one fixed tone and cannot make melodies.',
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
      tr: '8 LED’lik kısa şeritte 3.3V veri çalışır. Uzun şeritlerde seviye çevirici gerekir.',
      en: '3.3V data works on a short 8-LED stick. Longer strips need a level shifter.',
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
    name: { tr: 'Küçük hoparlör (3.5 mm veya USB)', en: 'Small speaker (3.5 mm or USB)' },
    category: 'ai',
    voltageRisk: 'safe',
  },
  'usb-hub': {
    id: 'usb-hub',
    name: { tr: 'Harici güçlü USB-C hub', en: 'Powered USB-C hub' },
    category: 'ai',
    voltageRisk: 'safe',
    voltageNote: {
      tr: 'Kartta tek USB-C portu var ve o da güç için kullanılıyor. Kamera + mikrofon + hoparlörü aynı anda bağlamak için harici beslemeli hub şart.',
      en: 'The board has a single USB-C port, also used for power. A powered hub is required to attach camera, microphone and speaker at once.',
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
