/*
  Proje 6 — Mesafeyle Oynanan Web Oyunu
  Arduino UNO Q  ·  sketch/sketch.ino

  Ne yapar?
    HC-SR04 ile elinin uzaklığını ölçer. Her ölçümde İKİ değer gönderir:
    ham okuma ve son birkaç okumanın ortalaması. Tarayıcıdaki oyun ikisini
    de çizer; balonun hangisini takip edeceğine sen karar verirsin.

  Bu sketch 3. projedeki devreyi AYNEN kullanır — tek bir kabloyu bile
  değiştirmene gerek yok. Değişen şey kod. Hatta LED'lerin anlamı bile
  değişti: 3. projede mesafeyi gösteriyorlardı, burada hedefe ne kadar
  yaklaştığını gösteriyorlar.

  Yönler:
    mikrodenetleyici → Bridge.notify("olcum", ...)   → Linux   (ölçüm)
    Linux → Bridge.call("set_target" / "beep_success") → mikrodenetleyici

  ┌──────────────────────────────────────────────────────────────┐
  │  DİKKAT: HC-SR04'ün ECHO pini 5V verir.                      │
  │  ECHO'yu D9'a DOĞRUDAN bağlarsan pini riske atarsın.         │
  │  Araya 2.2k + 3.3k gerilim bölücü ŞART.                      │
  └──────────────────────────────────────────────────────────────┘
*/

#include <Arduino_RouterBridge.h>
#include <Arduino_LED_Matrix.h>

// ───────────────── Pin tanımları (3. projeyle aynı) ─────────────────
const int PIN_TRIG   = 10;  // Sensöre gider  (kart → sensör, 3.3V yeterli)
const int PIN_ECHO   = 9;   // Sensörden gelir (GERİLİM BÖLÜCÜ ÜZERİNDEN!)
const int PIN_BUZZER = 8;   // Pasif buzzer ya da buzzer kartının S pini (+ 220 ohm seri direnç)

const int PIN_GREEN  = 4;
const int PIN_YELLOW = 3;
const int PIN_RED    = 2;

// ───────────────── Oyun alanı ─────────────────
// Balonun tabanı ile tavanı arasındaki mesafe aralığı.
// Elini sensörün üstünde bu aralıkta gezdiriyorsun.
const float PLAY_MIN = 5.0;    // cm — balon en altta
const float PLAY_MAX = 60.0;   // cm — balon en üstte

// ───────────────── Ölçüm ─────────────────
const unsigned long MEASURE_INTERVAL_MS = 60;   // Ölçümler arası bekleme

// 3. projede bu 25000 idi (~4 m). Burada oyun alanı 60 cm'i geçmiyor ve
// pulseIn zaman aşımı boyunca BLOKLUYOR — 25 ms, 60 ms'lik bütçenin neredeyse
// yarısı demek. 12000 µs (~2 m) hem fazlasıyla yeterli hem de döngüyü rahatlatıyor.
const unsigned long ECHO_TIMEOUT_US = 12000;

// ───────────────── Hareketli ortalama ─────────────────
// Halka tampon: son WINDOW_MAX ölçümü saklarız, ortalamayı bunların sadece
// en yeni "window" tanesinden alırız. window = 1 ise ortalama YOKTUR,
// ham ölçümün kendisidir — arayüzdeki kaydırıcı bunu değiştiriyor.
//
// 2. projede üstel ortalama (EMA) kullanmıştık; bu gerçek hareketli ortalama.
// EMA tek sayı tutar ama eski ölçümleri hiç unutmaz; bu, penceredeki ölçümlere
// eşit ağırlık verir ve pencere dışını tamamen unutur.
const int WINDOW_MAX = 9;
float samples[WINDOW_MAX];
int   sampleCount = 0;   // Tampon henüz dolmadıysa kaç ölçüm var
int   sampleIndex = 0;   // Sıradaki yazma yeri
int   window      = 5;   // Kaç ölçümün ortalaması alınsın

float rawCm = PLAY_MAX;
float avgCm = PLAY_MAX;

// ───────────────── Hedef bölge ─────────────────
// Tarayıcı her yeni turda hedefi bir kere gönderir; LED'leri ve matrisi
// kart kendi ölçümüyle sürer. Böylece her kare için ağ turu atmıyoruz.
float targetNear = 0.0;   // cm — bandın alt ucu
float targetFar  = 0.0;   // cm — bandın üst ucu
bool  hasTarget  = false;

const float NEAR_MARGIN_CM = 8.0;  // Bandın bu kadar yakınında sarı yanar

// Matristeki ilerleme çubuğu için. Sadece GÖSTERİM amaçlı —
// puanı kim veriyor sorusunun tek cevabı tarayıcı.
unsigned long inZoneSince = 0;
const unsigned long HOLD_MS = 2000;

// ───────────────── Buzzer ─────────────────
// 3 bacaklı buzzer kartı kullanıyorsan ve kartın üstündeki küçük transistörde
// 8550 ya da 9012 yazıyorsa bunu true yap.
const bool BUZZER_ACTIVE_LOW = false;

// Kutlama ezgisi — bloklamadan çalsın diye nota nota ilerliyoruz.
const int NOTES[]     = { 880, 1175, 1568 };
const int NOTE_COUNT  = 3;
const int NOTE_MS     = 110;
int  noteIndex = NOTE_COUNT;   // NOTE_COUNT = çalmıyor
unsigned long noteStartedAt = 0;

// ───────────────── LED matris ─────────────────
Arduino_LED_Matrix matrix;

const uint8_t FRAME_ROWS = 8;
const uint8_t FRAME_COLS = 13;
const uint8_t FRAME_SIZE = FRAME_ROWS * FRAME_COLS;

uint8_t frame[FRAME_SIZE] = { 0 };

const unsigned long DRAW_INTERVAL_MS = 100;  // Matris saniyede 10 kez yenilenir

// Matris ya da buzzer beklenmedik davranırsa birini kapatıp deneyebilmek için.
const bool MATRIX_ENABLED = true;
const bool BEEP_ENABLED   = true;

// ───────────────── Zamanlayıcılar ─────────────────
unsigned long lastMeasureAt = 0;
unsigned long lastDrawAt    = 0;

void setup() {
  Monitor.begin();

  pinMode(PIN_TRIG, OUTPUT);
  pinMode(PIN_ECHO, INPUT);
  pinMode(PIN_BUZZER, OUTPUT);
  pinMode(PIN_GREEN, OUTPUT);
  pinMode(PIN_YELLOW, OUTPUT);
  pinMode(PIN_RED, OUTPUT);

  digitalWrite(PIN_TRIG, LOW);
  buzzerOff();

  matrix.begin();
  matrix.setGrayscaleBits(3);   // Piksel başına 0-7 parlaklık
  matrix.clear();

  Bridge.begin();

  // Linux tarafının çağırabileceği fonksiyonlar.
  // Bu isimler main.py'deki Bridge.call çağrılarıyla BİREBİR aynı olmalı.
  Bridge.provide("set_target",   set_target);
  Bridge.provide("clear_target", clear_target);
  Bridge.provide("set_window",   set_window);
  Bridge.provide("beep_success", beep_success);

  Monitor.println("Mesafe oyunu hazir.");
}

void loop() {
  measureDistance();
  updateLeds();
  updateBuzzer();
  updateMatrix();
}

// ───────────────── Linux'tan gelen komutlar ─────────────────

// Mesafeler milimetre olarak geliyor: 20.0 cm = 200.
// Tam sayı göndermek, köprüde ondalık biçim tartışmasını ortadan kaldırıyor.
void set_target(int nearMm, int farMm) {
  targetNear  = nearMm / 10.0;
  targetFar   = farMm / 10.0;
  hasTarget   = true;
  inZoneSince = 0;
}

void clear_target() {
  hasTarget = false;
  inZoneSince = 0;
  digitalWrite(PIN_GREEN, LOW);
  digitalWrite(PIN_YELLOW, LOW);
  digitalWrite(PIN_RED, LOW);
}

void set_window(int value) {
  window = constrain(value, 1, WINDOW_MAX);
}

void beep_success() {
  if (!BEEP_ENABLED) return;
  noteIndex = 0;
  noteStartedAt = millis();
  tone(PIN_BUZZER, NOTES[0]);
}

// ───────────────── Ölçüm ─────────────────

void measureDistance() {
  if (millis() - lastMeasureAt < MEASURE_INTERVAL_MS) return;
  lastMeasureAt = millis();

  // Sensörü tetikle: 10 mikrosaniyelik bir darbe gönder
  digitalWrite(PIN_TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(PIN_TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(PIN_TRIG, LOW);

  unsigned long echoUs = pulseIn(PIN_ECHO, HIGH, ECHO_TIMEOUT_US);

  if (echoUs == 0) {
    // Zaman aşımı: menzilde el yok, balon tavanda kalsın
    rawCm = PLAY_MAX;
  } else {
    // Ses havada saniyede ~343 m yol alır = 0.0343 cm/µs.
    // Sinyal gidip geldiği için toplam yolu ikiye bölüyoruz.
    rawCm = (echoUs * 0.0343) / 2.0;
  }

  rawCm = constrain(rawCm, PLAY_MIN, PLAY_MAX);
  avgCm = pushSample(rawCm);

  // DİKKAT: buraya Monitor.println() KOYMA.
  // Saniyede ~17 ölçüm var; her birini yazdırmak monitörü boğar ve
  // döngüyü yavaşlatır. Hata ararken tek bir ölçümü yazdır, sonra sil.

  // İKİ değeri birden gönderiyoruz ki tarayıcı ikisini de çizip
  // aradaki farkı gösterebilsin.
  Bridge.notify("olcum", rawCm, avgCm);
}

// Yeni ölçümü halka tampona yazar ve son "window" ölçümün ortalamasını döndürür.
float pushSample(float value) {
  samples[sampleIndex] = value;
  sampleIndex = (sampleIndex + 1) % WINDOW_MAX;
  if (sampleCount < WINDOW_MAX) sampleCount++;

  int count = min(window, sampleCount);
  float total = 0;

  // En yeni ölçümden geriye doğru "count" tane topla
  for (int i = 0; i < count; i++) {
    int index = (sampleIndex - 1 - i + WINDOW_MAX) % WINDOW_MAX;
    total += samples[index];
  }

  return total / count;
}

// ───────────────── LED'ler ─────────────────

void updateLeds() {
  if (!hasTarget) return;

  // LED kararını da ortalanmış değerle veriyoruz. Tarayıcı balonu neye göre
  // oynatıyorsa kart da LED'i ona göre yaksın — ikisi farklı değeri görürse
  // "yeşil yanıyor ama puan gelmiyor" gibi anlaşılmaz bir durum çıkar.
  float error = 0;
  if (avgCm < targetNear)     error = targetNear - avgCm;
  else if (avgCm > targetFar) error = avgCm - targetFar;

  bool inZone = (error == 0);

  digitalWrite(PIN_GREEN,  inZone);
  digitalWrite(PIN_YELLOW, !inZone && error <= NEAR_MARGIN_CM);
  digitalWrite(PIN_RED,    error > NEAR_MARGIN_CM);

  // Matristeki ilerleme çubuğu için bantta ne kadar kalındığını sayıyoruz.
  if (inZone) {
    if (inZoneSince == 0) inZoneSince = millis();
  } else {
    inZoneSince = 0;
  }
}

// ───────────────── Buzzer ─────────────────

void updateBuzzer() {
  if (noteIndex >= NOTE_COUNT) return;
  if (millis() - noteStartedAt < (unsigned long)NOTE_MS) return;

  noteIndex++;
  noteStartedAt = millis();

  if (noteIndex < NOTE_COUNT) tone(PIN_BUZZER, NOTES[noteIndex]);
  else buzzerOff();
}

void buzzerOff() {
  noTone(PIN_BUZZER);
  digitalWrite(PIN_BUZZER, BUZZER_ACTIVE_LOW ? HIGH : LOW);
}

// ───────────────── LED matris ─────────────────
//
// Matris 13 sütun genişliğinde ve 8 satır yüksekliğinde. Rakam yazmak yerine
// oyunun kendisini çiziyoruz: iki yanda hedef parantezi, ortada balon,
// en altta bantta ne kadar kalındığını gösteren çubuk. 8 satırda bir seviye
// göstergesi, üç haneli bir sayıdan çok daha okunur — ve ekrana bakmadan
// oynayabilirsin.

void updateMatrix() {
  if (!MATRIX_ENABLED) return;
  if (millis() - lastDrawAt < DRAW_INTERVAL_MS) return;
  lastDrawAt = millis();

  memset(frame, 0, FRAME_SIZE);

  if (hasTarget) {
    drawBracket();
    drawProgress();
  }
  drawBalloon();

  matrix.draw(frame);
}

// Hedef bandı: en sol ve en sağ sütunlarda bir parantez
void drawBracket() {
  int topRow    = rowOf(targetFar);
  int bottomRow = rowOf(targetNear);

  for (int y = topRow; y <= bottomRow; y++) {
    setPixel(0, y, 3);
    setPixel(FRAME_COLS - 1, y, 3);
  }
}

// Balon: ortadaki üç sütunda iki satır yüksekliğinde bir blok
void drawBalloon() {
  int row = rowOf(avgCm);

  for (int x = 5; x <= 7; x++) {
    setPixel(x, row, 7);
    setPixel(x, row + 1, 4);
  }
}

// En alt satır: bantta geçen süre dolduğunda çubuk baştan sona uzar
void drawProgress() {
  if (inZoneSince == 0) return;

  unsigned long held = millis() - inZoneSince;
  if (held > HOLD_MS) held = HOLD_MS;

  int width = (int)((held * FRAME_COLS) / HOLD_MS);

  for (int x = 0; x < width; x++) {
    setPixel(x, FRAME_ROWS - 1, 5);
  }
}

void setPixel(int x, int y, uint8_t value) {
  if (x < 0 || x >= FRAME_COLS || y < 0 || y >= FRAME_ROWS) return;
  frame[y * FRAME_COLS + x] = value;
}

// Mesafeyi matris satırına çevirir: uzak = üst satır (0), yakın = alt satır (7).
int rowOf(float cm) {
  float ratio = (cm - PLAY_MIN) / (PLAY_MAX - PLAY_MIN);
  int row = (int)round((1.0 - ratio) * (FRAME_ROWS - 1));
  return constrain(row, 0, FRAME_ROWS - 1);
}
