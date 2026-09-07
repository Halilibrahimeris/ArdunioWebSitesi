/*
  Proje 3 — Park Sensörü
  Arduino UNO Q  ·  sketch/sketch.ino

  Ne yapar?
    HC-SR04 ultrasonik sensör önündeki engelin uzaklığını ölçer.
    Engel yaklaştıkça buzzer daha sık biper ve LED'ler kırmızıya doğru kayar.
    30 cm'nin altında ses kesintisiz olur — arabayı durdurma sinyali.

  ┌──────────────────────────────────────────────────────────────┐
  │  DİKKAT: HC-SR04'ün ECHO pini 5V verir.                      │
  │  ECHO'yu D9'a DOĞRUDAN bağlarsan pini kalıcı olarak bozarsın.│
  │  Araya 2.2k + 3.3k gerilim bölücü ŞART.                      │
  └──────────────────────────────────────────────────────────────┘
*/

#include <Arduino_RouterBridge.h>   // Monitor / App Lab serial monitor

// ───────────────── Pin tanımları ─────────────────
const int PIN_TRIG   = 10;  // Sensöre gider  (kart → sensör, 3.3V yeterli)
const int PIN_ECHO   = 9;   // Sensörden gelir (GERİLİM BÖLÜCÜ ÜZERİNDEN!)
const int PIN_BUZZER = 8;

const int PIN_GREEN  = 4;
const int PIN_YELLOW = 3;
const int PIN_RED    = 2;

// ───────────────── Mesafe eşikleri (cm) ─────────────────
const float DIST_FAR    = 100.0;  // Bunun ötesi "uzak", hiç bip yok
const float DIST_NEAR   = 50.0;   // Sarı bölge başlangıcı
const float DIST_DANGER = 30.0;   // Kırmızı bölge — kesintisiz ses
const float DIST_MAX    = 400.0;  // HC-SR04'ün ölçebildiği üst sınır

// ───────────────── Bip ayarları ─────────────────
const int BEEP_TONE      = 800;   // Bip frekansı (Hz)
const int BEEP_LENGTH_MS = 60;    // Her bipin süresi
const int BEEP_GAP_MIN   = 60;    // En sık bip aralığı (yakınken)
const int BEEP_GAP_MAX   = 900;   // En seyrek bip aralığı (uzakken)

// ───────────────── Zamanlama ─────────────────
const unsigned long MEASURE_INTERVAL_MS = 60;   // Ölçümler arası bekleme
const unsigned long ECHO_TIMEOUT_US     = 25000; // ~4 m karşılığı

unsigned long lastMeasureAt = 0;
unsigned long lastBeepAt    = 0;
bool          beeping       = false;

float distanceCm = DIST_MAX;   // Son geçerli ölçüm

void setup() {
  Monitor.begin();

  pinMode(PIN_TRIG, OUTPUT);
  pinMode(PIN_ECHO, INPUT);
  pinMode(PIN_BUZZER, OUTPUT);
  pinMode(PIN_GREEN, OUTPUT);
  pinMode(PIN_YELLOW, OUTPUT);
  pinMode(PIN_RED, OUTPUT);

  digitalWrite(PIN_TRIG, LOW);
}

void loop() {
  measureDistance();
  updateLeds();
  updateBuzzer();
}

// ───────────────── Mesafeyi ölç ─────────────────
void measureDistance() {
  if (millis() - lastMeasureAt < MEASURE_INTERVAL_MS) return;
  lastMeasureAt = millis();

  // Sensörü tetikle: 10 mikrosaniyelik bir darbe gönder
  digitalWrite(PIN_TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(PIN_TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(PIN_TRIG, LOW);

  // ECHO pininin ne kadar süre HIGH kaldığını ölç
  unsigned long echoUs = pulseIn(PIN_ECHO, HIGH, ECHO_TIMEOUT_US);

  if (echoUs == 0) {
    // Zaman aşımı: menzilde engel yok
    distanceCm = DIST_MAX;
    return;
  }

  // Ses havada saniyede ~343 m yol alır = 0.0343 cm/µs.
  // Sinyal gidip geldiği için toplam yolu ikiye bölüyoruz.
  distanceCm = (echoUs * 0.0343) / 2.0;

  Monitor.print("Mesafe: ");
  Monitor.print(distanceCm, 1);
  Monitor.println(" cm");
}

// ───────────────── LED'leri güncelle ─────────────────
void updateLeds() {
  digitalWrite(PIN_GREEN,  distanceCm >= DIST_NEAR);
  digitalWrite(PIN_YELLOW, distanceCm < DIST_NEAR && distanceCm >= DIST_DANGER);
  digitalWrite(PIN_RED,    distanceCm < DIST_DANGER);
}

// ───────────────── Buzzer'ı güncelle ─────────────────
// delay() kullanmadan bip aralığını mesafeye göre ayarlıyoruz.
void updateBuzzer() {
  // Çok uzaksa sessiz kal
  if (distanceCm >= DIST_FAR) {
    noTone(PIN_BUZZER);
    beeping = false;
    return;
  }

  // Tehlike bölgesinde kesintisiz ses
  if (distanceCm < DIST_DANGER) {
    tone(PIN_BUZZER, BEEP_TONE);
    beeping = true;
    return;
  }

  // Arada: mesafe azaldıkça bip aralığı kısalsın
  int gap = (int)mapFloat(distanceCm, DIST_DANGER, DIST_FAR, BEEP_GAP_MIN, BEEP_GAP_MAX);

  unsigned long now = millis();

  if (beeping && now - lastBeepAt >= (unsigned long)BEEP_LENGTH_MS) {
    noTone(PIN_BUZZER);
    beeping = false;
    lastBeepAt = now;
  } else if (!beeping && now - lastBeepAt >= (unsigned long)gap) {
    tone(PIN_BUZZER, BEEP_TONE);
    beeping = true;
    lastBeepAt = now;
  }
}

// map() tam sayılarla çalışır; ondalıklı mesafe için kendi sürümümüz
float mapFloat(float value, float inMin, float inMax, float outMin, float outMax) {
  if (value < inMin) value = inMin;
  if (value > inMax) value = inMax;
  return (value - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
}
