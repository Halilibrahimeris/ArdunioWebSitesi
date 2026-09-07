/*
  Proje 7 — Akıllı Priz
  Arduino UNO Q  ·  sketch/sketch.ino

  Ne yapar?
    Web arayüzünden gelen komutlarla bir röleyi açıp kapatır ve WS2812 RGB
    LED şeridin rengini/parlaklığını değiştirir. Röleye zamanlayıcı kurulabilir.

  ┌────────────────────────────────────────────────────────────────────┐
  │  GÜVENLİK: Bu projede röleye ŞEBEKE GERİLİMİ (220V) BAĞLAMA.       │
  │  Röleyi yalnızca pille çalışan bir lamba, küçük bir fan veya       │
  │  başka bir düşük gerilimli yükle dene. Şebeke gerilimi öldürür.    │
  └────────────────────────────────────────────────────────────────────┘

  3.3V notu:
    Röle modülleri 5V ile çalışır ve girişleri genellikle aktif-DÜŞÜK'tür.
    Kartın 3.3V'u modülü güvenilir biçimde kapatmaya yetmeyebilir.
    Bu yüzden araya bir 2N2222 transistör koyuyoruz: kart transistörü sürüyor,
    transistör de röle girişini toprağa çekiyor.
*/

#include <Arduino_RouterBridge.h>
#include <Adafruit_NeoPixel.h>

// ───────────────── Pin tanımları ─────────────────
const int PIN_RELAY = 5;    // 10k direnç üzerinden 2N2222'nin bazına
const int PIN_STRIP = 6;    // WS2812 veri girişi

const int STRIP_LEDS = 8;

Adafruit_NeoPixel strip(STRIP_LEDS, PIN_STRIP, NEO_GRB + NEO_KHZ800);

// ───────────────── Durum ─────────────────
bool    relayOn    = false;
uint8_t red        = 0;
uint8_t green      = 120;
uint8_t blue       = 255;
uint8_t brightness = 60;    // 0-255

// Zamanlayıcı: 0 ise kapalı. Değilse rölenin kapanacağı an (millis).
unsigned long relayOffAt = 0;

void setup() {
  Monitor.begin();

  pinMode(PIN_RELAY, OUTPUT);
  digitalWrite(PIN_RELAY, LOW);   // Açılışta röle kapalı olsun

  strip.begin();
  strip.setBrightness(brightness);
  strip.clear();
  strip.show();

  Bridge.begin();

  Bridge.provide("set_relay",      set_relay);
  Bridge.provide("set_color",      set_color);
  Bridge.provide("set_brightness", set_brightness);
  Bridge.provide("set_timer",      set_timer);

  Monitor.println("Akilli priz hazir");
}

void loop() {
  checkTimer();
}

// ───────────────── Linux'tan çağrılan fonksiyonlar ─────────────────

// Röleyi aç / kapat. 1 = açık, 0 = kapalı.
void set_relay(int state) {
  relayOn = (state != 0);
  digitalWrite(PIN_RELAY, relayOn ? HIGH : LOW);

  // Röle elle kapatıldıysa bekleyen zamanlayıcıyı da iptal et
  if (!relayOn) {
    relayOffAt = 0;
  }

  Monitor.print("Role: ");
  Monitor.println(relayOn ? "ACIK" : "KAPALI");
}

// Şeridin rengini ayarla (0-255 x 3)
void set_color(int r, int g, int b) {
  red   = constrain(r, 0, 255);
  green = constrain(g, 0, 255);
  blue  = constrain(b, 0, 255);
  applyStrip();
}

// Şeridin parlaklığını ayarla (0-255)
void set_brightness(int value) {
  brightness = constrain(value, 0, 255);
  strip.setBrightness(brightness);
  applyStrip();
}

// Röleyi kaç dakika sonra kapat? 0 = zamanlayıcıyı iptal et.
void set_timer(int minutes) {
  if (minutes <= 0) {
    relayOffAt = 0;
    Monitor.println("Zamanlayici iptal edildi");
    return;
  }

  relayOffAt = millis() + (unsigned long)minutes * 60000UL;

  Monitor.print("Role ");
  Monitor.print(minutes);
  Monitor.println(" dakika sonra kapanacak");
}

// ───────────────── Yardımcılar ─────────────────

void applyStrip() {
  for (int i = 0; i < STRIP_LEDS; i++) {
    strip.setPixelColor(i, strip.Color(red, green, blue));
  }
  strip.show();
}

// Zamanlayıcının süresi doldu mu? delay() kullanmadan kontrol ediyoruz.
void checkTimer() {
  if (relayOffAt == 0) return;              // Zamanlayıcı kapalı
  if (millis() < relayOffAt) return;        // Henüz vakti gelmedi

  relayOffAt = 0;
  relayOn = false;
  digitalWrite(PIN_RELAY, LOW);

  Monitor.println("Zamanlayici doldu, role kapatildi");

  // Linux tarafına haber ver ki web arayüzü de güncellensin
  Bridge.notify("relay_changed", 0);
}
