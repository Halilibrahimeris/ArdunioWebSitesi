/*
  Proje 6 — Web'den LED Matrise Yazı Yazma
  Arduino UNO Q  ·  sketch/sketch.ino  (STM32 mikrodenetleyicide çalışır)

  Ne yapar?
    Linux tarafından gelen metni 8x13 LED matriste soldan sağa kaydırır.
    Metin, parlaklık ve hız web arayüzünden anlık olarak değiştirilebilir.

  Buradaki fikir 5. projenin TERSİ:
    5. projede mikrodenetleyici Linux'u çağırıyordu (Bridge.notify).
    Burada Linux mikrodenetleyiciyi çağırıyor (Bridge.call → Bridge.provide).

  Matris metin yazamaz — bu yüzden kendi 3x5 fontumuzu tanımlıyoruz.
*/

#include <Arduino_RouterBridge.h>
#include <Arduino_LED_Matrix.h>

Arduino_LED_Matrix matrix;

// ───────────────── Matris ─────────────────
const uint8_t FRAME_ROWS = 8;
const uint8_t FRAME_COLS = 13;
const uint8_t FRAME_SIZE = FRAME_ROWS * FRAME_COLS;

uint8_t frame[FRAME_SIZE] = { 0 };

// ───────────────── 3x5 font ─────────────────
// Her karakter 3 sütun geniş, 5 satır yüksek.
// Bir sütun tek bir bayt: bit0 = en üst satır, bit4 = en alt satır.
//
// Örnek: harf A
//   . # .      sütun0 = satır 1,2,3,4  -> 0b11110 = 0x1E
//   # . #      sütun1 = satır 0,2      -> 0b00101 = 0x05
//   # # #      sütun2 = satır 1,2,3,4  -> 0b11110 = 0x1E
//   # . #
//   # . #
const uint8_t GLYPH_WIDTH   = 3;
const uint8_t GLYPH_SPACING = 1;   // Harfler arası boşluk sütunu
const uint8_t CHAR_COLS     = GLYPH_WIDTH + GLYPH_SPACING;

// Desteklenen karakterler, font tablosuyla AYNI sırada olmalı
const char CHARSET[] = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .-!?:";

const uint8_t FONT[][GLYPH_WIDTH] = {
  { 0x1E, 0x05, 0x1E },  // A
  { 0x1F, 0x15, 0x0A },  // B
  { 0x0E, 0x11, 0x11 },  // C
  { 0x1F, 0x11, 0x0E },  // D
  { 0x1F, 0x15, 0x11 },  // E
  { 0x1F, 0x05, 0x01 },  // F
  { 0x0E, 0x11, 0x1D },  // G
  { 0x1F, 0x04, 0x1F },  // H
  { 0x11, 0x1F, 0x11 },  // I
  { 0x08, 0x10, 0x0F },  // J
  { 0x1F, 0x04, 0x1B },  // K
  { 0x1F, 0x10, 0x10 },  // L
  { 0x1F, 0x06, 0x1F },  // M
  { 0x1F, 0x02, 0x1F },  // N
  { 0x0E, 0x11, 0x0E },  // O
  { 0x1F, 0x05, 0x02 },  // P
  { 0x0E, 0x11, 0x1E },  // Q
  { 0x1F, 0x05, 0x1A },  // R
  { 0x12, 0x15, 0x09 },  // S
  { 0x01, 0x1F, 0x01 },  // T
  { 0x1F, 0x10, 0x1F },  // U
  { 0x0F, 0x10, 0x0F },  // V
  { 0x1F, 0x0C, 0x1F },  // W
  { 0x1B, 0x04, 0x1B },  // X
  { 0x03, 0x1C, 0x03 },  // Y
  { 0x19, 0x15, 0x13 },  // Z
  { 0x0E, 0x11, 0x0E },  // 0
  { 0x12, 0x1F, 0x10 },  // 1
  { 0x19, 0x15, 0x12 },  // 2
  { 0x11, 0x15, 0x0E },  // 3
  { 0x07, 0x04, 0x1F },  // 4
  { 0x07, 0x15, 0x19 },  // 5
  { 0x0E, 0x15, 0x09 },  // 6
  { 0x01, 0x1D, 0x03 },  // 7
  { 0x0A, 0x15, 0x0A },  // 8
  { 0x12, 0x15, 0x0E },  // 9
  { 0x00, 0x00, 0x00 },  // boşluk
  { 0x00, 0x10, 0x00 },  // .
  { 0x04, 0x04, 0x04 },  // -
  { 0x00, 0x17, 0x00 },  // !
  { 0x01, 0x15, 0x03 },  // ?
  { 0x00, 0x0A, 0x00 },  // :
};

// Metnin dikeyde nereden başlayacağı: 8 satırın ortasına 5 satırlık yazı
const uint8_t TEXT_TOP = 1;

// ───────────────── Durum ─────────────────
const int MAX_TEXT = 64;
char    message[MAX_TEXT + 1] = "MERHABA";
uint8_t brightness = 7;      // 0-7
int     scrollMs   = 90;     // Bir sütun kaydırma süresi (küçük = hızlı)

int           scrollOffset = 0;
unsigned long lastScrollAt = 0;

void setup() {
  Monitor.begin();

  matrix.begin();
  matrix.setGrayscaleBits(3);
  matrix.clear();

  Bridge.begin();

  // Linux tarafının çağırabileceği fonksiyonları duyur.
  // Bu isimler main.py'deki Bridge.call çağrılarıyla BİREBİR aynı olmalı.
  Bridge.provide("show_text",     show_text);
  Bridge.provide("set_brightness", set_brightness);
  Bridge.provide("set_speed",      set_speed);

  Monitor.println("Matris hazir, web arayuzunden yazi bekleniyor");
}

void loop() {
  if (millis() - lastScrollAt < (unsigned long)scrollMs) return;
  lastScrollAt = millis();

  drawFrame();

  scrollOffset++;
  if (scrollOffset >= totalScrollWidth()) {
    scrollOffset = 0;   // Başa dön, sonsuz döngü
  }
}

// ───────────────── Linux'tan çağrılan fonksiyonlar ─────────────────

// Gösterilecek metni değiştirir
void show_text(String text) {
  int len = text.length();
  if (len > MAX_TEXT) len = MAX_TEXT;

  for (int i = 0; i < len; i++) {
    message[i] = text[i];
  }
  message[len] = '\0';

  scrollOffset = 0;   // Yeni metin baştan kaysın

  Monitor.print("Yeni metin: ");
  Monitor.println(message);
}

// Parlaklığı değiştirir (0-7)
void set_brightness(int value) {
  brightness = constrain(value, 0, 7);
}

// Kaydırma hızını değiştirir (milisaniye)
void set_speed(int value) {
  scrollMs = constrain(value, 20, 400);
}

// ───────────────── Çizim ─────────────────

// Metin kaç sütun sürüyor? Başta ve sonda birer ekran boşluk bırakıyoruz,
// böylece yazı sağdan girip soldan tamamen çıkıyor.
int textWidth() {
  return strlen(message) * CHAR_COLS;
}

int totalScrollWidth() {
  return textWidth() + FRAME_COLS;
}

// CHARSET içinde karakterin kaçıncı sırada olduğunu bulur.
// Bulamazsa boşluk döndürür.
int glyphIndex(char c) {
  // Küçük harfleri büyüğe çevir
  if (c >= 'a' && c <= 'z') c = c - 'a' + 'A';

  for (int i = 0; CHARSET[i] != '\0'; i++) {
    if (CHARSET[i] == c) return i;
  }
  return 36;   // CHARSET içindeki boşluk karakterinin sırası
}

// Kaydırılmış metnin verilen sütununu döndürür.
// Sütun harfler arası boşluğa denk geliyorsa 0 (boş) döner.
uint8_t columnAt(int column) {
  if (column < 0 || column >= textWidth()) return 0;

  int charIdx = column / CHAR_COLS;
  int subCol  = column % CHAR_COLS;

  if (subCol >= GLYPH_WIDTH) return 0;   // Harfler arası boşluk

  return FONT[glyphIndex(message[charIdx])][subCol];
}

void drawFrame() {
  memset(frame, 0, FRAME_SIZE);

  for (int x = 0; x < FRAME_COLS; x++) {
    // Ekranın x sütununda, metnin hangi sütunu var?
    uint8_t bits = columnAt(scrollOffset + x - FRAME_COLS);

    for (int bit = 0; bit < 5; bit++) {
      if (bits & (1 << bit)) {
        int y = TEXT_TOP + bit;
        if (y >= 0 && y < FRAME_ROWS) {
          frame[y * FRAME_COLS + x] = brightness;
        }
      }
    }
  }

  matrix.draw(frame);
}
