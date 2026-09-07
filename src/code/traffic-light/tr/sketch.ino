/*
  Proje 1 — Trafik Lambası
  Arduino UNO Q  ·  sketch/sketch.ino  (STM32 mikrodenetleyicide çalışır)

  Ne yapar?
    Kırmızı → Kırmızı+Sarı → Yeşil → Sarı sırasıyla dönen bir trafik lambası.
    Butona basılınca yaya talebi kaydedilir ve yeşil ışık erken sonlandırılır.
    Kartın üzerindeki 8x13 LED matris, breadboard'daki lambanın küçük bir
    kopyasını çizer; sağ kenardaki çubuk evrenin ne kadar kaldığını gösterir.

  Önemli: Kartın tüm pinleri 3.3V ile çalışır. LED'leri 220 ohm direnç
  olmadan bağlama — hem LED hem pin zarar görür.
*/

#include <Arduino_RouterBridge.h>   // Monitor (App Lab seri monitörü) için
#include <Arduino_LED_Matrix.h>

Arduino_LED_Matrix matrix;

// ───────────────── LED matris ─────────────────
// Matris 8 satır × 13 sütun. Pikselleri düz bir dizide tutuyoruz;
// (x, y) konumundaki pikselin dizideki yeri: y * 13 + x
const uint8_t FRAME_ROWS = 8;
const uint8_t FRAME_COLS = 13;
const uint8_t FRAME_SIZE = FRAME_ROWS * FRAME_COLS;   // 104 piksel

uint8_t frame[FRAME_SIZE] = { 0 };

// setGrayscaleBits(3) ile parlaklık 0-7 arasında olur. 7 = en parlak.
const uint8_t BRIGHT = 7;
const uint8_t DIM    = 2;

// ───────────────── Pin tanımları ─────────────────
const int PIN_RED    = 2;   // Kırmızı LED  (+ 220 ohm)
const int PIN_YELLOW = 3;   // Sarı LED     (+ 220 ohm)
const int PIN_GREEN  = 4;   // Yeşil LED    (+ 220 ohm)
const int PIN_BUTTON = 7;   // Buton        (+ 10k pull-down direnç)

// ───────────────── Işık evreleri ─────────────────
// Sıra: KIRMIZI → KIRMIZI+SARI → YESIL → SARI → (başa dön)
enum Phase { PHASE_RED, PHASE_RED_YELLOW, PHASE_GREEN, PHASE_YELLOW };
const int PHASE_COUNT = 4;

// Her evrenin normal süresi (milisaniye)
const unsigned long PHASE_MS[PHASE_COUNT] = { 6000, 1500, 6000, 2000 };

// ───────────────── Durum değişkenleri ─────────────────
int           currentPhase     = PHASE_RED;
unsigned long phaseStartedAt   = 0;      // Bu evre ne zaman başladı?
bool          pedestrianWaiting = false;

// Buton sıçramasını (debounce) engellemek için
bool          lastButtonReading = false;
unsigned long lastButtonChange  = 0;
const unsigned long DEBOUNCE_MS = 40;

// Yeşilde yaya beklerken ışığın en fazla ne kadar daha yanacağı
const unsigned long GREEN_CUTOFF_MS = 1500;

// Matrisi her turda değil, saniyede ~20 kez tazele
unsigned long lastDrawAt = 0;
const unsigned long DRAW_INTERVAL_MS = 50;

void setup() {
  Monitor.begin();   // App Lab'in seri monitörüne yazmak için

  pinMode(PIN_RED,    OUTPUT);
  pinMode(PIN_YELLOW, OUTPUT);
  pinMode(PIN_GREEN,  OUTPUT);
  pinMode(PIN_BUTTON, INPUT);   // Harici 10k pull-down direnç kullanıyoruz

  matrix.begin();
  matrix.setGrayscaleBits(3);   // Her piksel için 0-7 arası parlaklık
  matrix.clear();

  phaseStartedAt = millis();
  applyPhase();

  Monitor.println("Trafik lambasi basladi");
}

void loop() {
  readButton();      // Butonu her turda oku
  updatePhase();     // Süresi dolan evreyi ilerlet
  drawMatrix();      // Matrisi tazele
}

// ───────────────── Butonu oku ─────────────────
// delay() KULLANMIYORUZ: delay() beklerken buton basışları kaçardı.
void readButton() {
  bool reading = (digitalRead(PIN_BUTTON) == HIGH);

  // Sinyal değiştiyse zamanlayıcıyı sıfırla
  if (reading != lastButtonReading) {
    lastButtonChange  = millis();
    lastButtonReading = reading;
    return;
  }

  // Sinyal yeterince uzun süre sabit kaldıysa bu gerçek bir basıştır
  if (reading && (millis() - lastButtonChange) > DEBOUNCE_MS) {
    if (!pedestrianWaiting) {
      pedestrianWaiting = true;
      Monitor.println("Yaya istegi alindi");
    }
  }
}

// ───────────────── Bu evrenin süresi ─────────────────
unsigned long currentPhaseDuration() {
  unsigned long limit = PHASE_MS[currentPhase];

  // Yaya bekliyorsa yeşil ışığı kısalt
  if (currentPhase == PHASE_GREEN && pedestrianWaiting && limit > GREEN_CUTOFF_MS) {
    limit = GREEN_CUTOFF_MS;
  }
  return limit;
}

// ───────────────── Evreyi ilerlet ─────────────────
void updatePhase() {
  if (millis() - phaseStartedAt < currentPhaseDuration()) {
    return;                          // Henüz sırası değil
  }

  currentPhase   = (currentPhase + 1) % PHASE_COUNT;
  phaseStartedAt = millis();

  // Kırmızıya dönüldüğünde yaya talebi karşılanmış olur
  if (currentPhase == PHASE_RED) {
    pedestrianWaiting = false;
  }

  applyPhase();
}

// ───────────────── Breadboard LED'lerini güncelle ─────────────────
void applyPhase() {
  digitalWrite(PIN_RED,    currentPhase == PHASE_RED || currentPhase == PHASE_RED_YELLOW);
  digitalWrite(PIN_YELLOW, currentPhase == PHASE_RED_YELLOW || currentPhase == PHASE_YELLOW);
  digitalWrite(PIN_GREEN,  currentPhase == PHASE_GREEN);
}

// ───────────────── Tek bir pikseli ayarla ─────────────────
// x: 0-12 (sütun), y: 0-7 (satır), value: 0-7 (parlaklık)
void setPixel(int x, int y, uint8_t value) {
  if (x < 0 || x >= FRAME_COLS || y < 0 || y >= FRAME_ROWS) return;   // Ekran dışı
  frame[y * FRAME_COLS + x] = value;
}

// Sol üst köşesi (x, y) olan 3x2 lambayı çizer
void drawLamp(int x, int y, bool on) {
  uint8_t value = on ? BRIGHT : 0;
  for (int dx = 0; dx < 3; dx++) {
    for (int dy = 0; dy < 2; dy++) {
      setPixel(x + dx, y + dy, value);
    }
  }
}

// ───────────────── Matrise mini trafik lambası çiz ─────────────────
void drawMatrix() {
  if (millis() - lastDrawAt < DRAW_INTERVAL_MS) return;
  lastDrawAt = millis();

  // Çerçeveyi temizle
  memset(frame, 0, FRAME_SIZE);

  // Üç lamba: her biri 3 piksel geniş, 2 piksel yüksek
  drawLamp(2, 0, currentPhase == PHASE_RED || currentPhase == PHASE_RED_YELLOW);
  drawLamp(2, 3, currentPhase == PHASE_RED_YELLOW || currentPhase == PHASE_YELLOW);
  drawLamp(2, 6, currentPhase == PHASE_GREEN);

  // Sağ kenarda kalan süreyi gösteren dikey çubuk
  unsigned long elapsed = millis() - phaseStartedAt;
  unsigned long total   = currentPhaseDuration();
  int remainingRows = FRAME_ROWS - (int)((elapsed * FRAME_ROWS) / total);
  for (int y = 0; y < remainingRows; y++) {
    setPixel(FRAME_COLS - 1, FRAME_ROWS - 1 - y, DIM);
  }

  // Yaya bekliyorsa sol üstte yanıp sönen nokta
  if (pedestrianWaiting && (millis() / 400) % 2 == 0) {
    setPixel(0, 0, BRIGHT);
  }

  // Hazırladığımız çerçeveyi ekrana bas
  matrix.draw(frame);
}
