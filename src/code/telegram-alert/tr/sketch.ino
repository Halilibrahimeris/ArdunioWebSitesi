/*
  Proje 9 — Telegram Bot
  Arduino UNO Q  ·  sketch/sketch.ino

  Ne yapar?
    HC-SR501 PIR sensörü hareket algıladığında Linux tarafına haber verir.
    Ayrıca kartın üzerindeki LED matriste küçük bir hareket göstergesi çizer.

  PIR sensörü hakkında:
    5V ile beslenir ama çıkışı 3.3V TTL'dir — doğrudan bağlanabilir,
    gerilim bölücü gerekmez. (3. projedeki HC-SR04'ten farkı bu.)
*/

#include <Arduino_RouterBridge.h>
#include <Arduino_LED_Matrix.h>

Arduino_LED_Matrix matrix;

// ───────────────── Pin tanımları ─────────────────
const int PIN_PIR = 2;

// ───────────────── Matris ─────────────────
const uint8_t FRAME_ROWS = 8;
const uint8_t FRAME_COLS = 13;
const uint8_t FRAME_SIZE = FRAME_ROWS * FRAME_COLS;
uint8_t frame[FRAME_SIZE] = { 0 };

// ───────────────── Durum ─────────────────
bool lastMotion = false;

// PIR sensörü tetiklendikten sonra bir süre HIGH kalır.
// Aynı hareketi defalarca saymamak için bekleme süresi koyuyoruz.
const unsigned long COOLDOWN_MS = 5000;
unsigned long lastReportAt = 0;

// Hareket algılandığında matriste ne kadar süre gösterge yansın
const unsigned long INDICATOR_MS = 3000;
unsigned long indicatorUntil = 0;

unsigned long lastDrawAt = 0;
const unsigned long DRAW_INTERVAL_MS = 100;

void setup() {
  Monitor.begin();

  pinMode(PIN_PIR, INPUT);

  matrix.begin();
  matrix.setGrayscaleBits(3);
  matrix.clear();

  Bridge.begin();

  Monitor.println("PIR sensoru isiniyor, ilk 30 saniye bekle...");
}

void loop() {
  checkMotion();
  drawIndicator();
}

// ───────────────── Hareketi kontrol et ─────────────────
void checkMotion() {
  bool motion = (digitalRead(PIN_PIR) == HIGH);

  // Yalnızca YENİ bir hareket başlangıcını bildir (yükselen kenar)
  if (motion && !lastMotion) {
    // Bekleme süresi dolmadıysa aynı olayı tekrar bildirme
    if (millis() - lastReportAt >= COOLDOWN_MS) {
      lastReportAt = millis();
      indicatorUntil = millis() + INDICATOR_MS;

      // Linux tarafına haber ver
      Bridge.notify("hareket", 1);

      Monitor.println("Hareket algilandi");
    }
  }

  lastMotion = motion;
}

// ───────────────── Matriste gösterge ─────────────────
// Hareket algılandığında yanıp sönen bir ünlem işareti çizer.
void drawIndicator() {
  if (millis() - lastDrawAt < DRAW_INTERVAL_MS) return;
  lastDrawAt = millis();

  memset(frame, 0, FRAME_SIZE);

  bool active = millis() < indicatorUntil;

  if (active && (millis() / 300) % 2 == 0) {
    // Ortada bir ünlem işareti: gövde + nokta
    for (int y = 1; y <= 4; y++) {
      setPixel(6, y, 7);
    }
    setPixel(6, 6, 7);
  } else if (!active) {
    // Bekleme durumunda köşede sönük bir nokta — sistem çalışıyor demek
    setPixel(0, 7, 1);
  }

  matrix.draw(frame);
}

void setPixel(int x, int y, uint8_t value) {
  if (x < 0 || x >= FRAME_COLS || y < 0 || y >= FRAME_ROWS) return;
  frame[y * FRAME_COLS + x] = value;
}
