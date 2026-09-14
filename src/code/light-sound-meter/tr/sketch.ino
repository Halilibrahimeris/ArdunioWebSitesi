/*
  Proje 2 — Işık ve Ses Ölçer
  Arduino UNO Q  ·  sketch/sketch.ino

  Ne yapar?
    LDR ortamdaki ışığı ölçer. Beş LED'lik bir çubuk ışık seviyesini gösterir.
    Potansiyometre ile alarm eşiğini ayarlarsın; ışık eşiğin altına düşerse
    buzzer öter. Ötme sesinin tonu karanlıkla birlikte alçalır.

  Bu projede analog dünyaya giriyoruz: pin artık sadece 0 veya 1 değil,
  arada bir sayı okuyor.
*/

#include <Arduino_RouterBridge.h>   // Monitor / App Lab serial monitor

// ───────────────── Pin tanımları ─────────────────
const int PIN_LDR    = A0;   // LDR + 10k gerilim bölücü
const int PIN_POT    = A1;   // Potansiyometrenin orta bacağı
const int PIN_BUZZER = 8;    // Pasif buzzer (+ 220 ohm seri direnç)

// LED çubuğu: soldan sağa beş LED (her biri + 220 ohm)
const int LED_PINS[]  = { 2, 3, 4, 5, 6 };
const int LED_COUNT   = 5;

// ───────────────── Ayarlar ─────────────────
// analogRead'in kaç bit çözünürlükte okuyacağını AÇIKÇA belirtiyoruz.
// Böylece kart hangi varsayılanı kullanırsa kullansın, kod aynı davranır.
const int ADC_BITS = 10;
const int ADC_MAX  = 1023;   // 2^10 - 1

// Buzzer'ın üreteceği ton aralığı (Hz)
const int TONE_MIN = 200;
const int TONE_MAX = 1200;

// Okumaları yumuşatmak için: yeni değerin ağırlığı (0.0 - 1.0)
// Küçük sayı = daha yumuşak ama daha yavaş tepki
const float SMOOTHING = 0.2;

float smoothedLight = 0;     // Yumuşatılmış ışık değeri

unsigned long lastPrintAt = 0;

void setup() {
  Monitor.begin();

  analogReadResolution(ADC_BITS);

  for (int i = 0; i < LED_COUNT; i++) {
    pinMode(LED_PINS[i], OUTPUT);
  }
  pinMode(PIN_BUZZER, OUTPUT);

  // İlk okumayı doğrudan al ki çubuk sıfırdan tırmanmasın
  smoothedLight = analogRead(PIN_LDR);
}

void loop() {
  // ── Ham değerleri oku ──
  int rawLight = analogRead(PIN_LDR);   // 0 (karanlık) .. 1023 (aydınlık)
  int rawPot   = analogRead(PIN_POT);   // 0 .. 1023

  // ── Yumuşat ──
  // Tek bir okuma titrek olur; her yeni okumayı eskisine yavaşça karıştırıyoruz.
  smoothedLight = smoothedLight * (1.0 - SMOOTHING) + rawLight * SMOOTHING;

  // ── LED çubuğunu güncelle ──
  // Işık seviyesini 0-5 arası bir LED sayısına çevir
  int litCount = map((int)smoothedLight, 0, ADC_MAX, 0, LED_COUNT);
  litCount = constrain(litCount, 0, LED_COUNT);

  for (int i = 0; i < LED_COUNT; i++) {
    digitalWrite(LED_PINS[i], i < litCount ? HIGH : LOW);
  }

  // ── Alarm ──
  // Potansiyometre eşiği belirler: sonuna kadar çevirince alarm hiç çalmaz
  int threshold = rawPot;

  if (smoothedLight < threshold) {
    // Ne kadar karanlıksa ton o kadar alçak
    int frequency = map((int)smoothedLight, 0, threshold, TONE_MIN, TONE_MAX);
    frequency = constrain(frequency, TONE_MIN, TONE_MAX);
    tone(PIN_BUZZER, frequency);
  } else {
    noTone(PIN_BUZZER);
  }

  // ── Saniyede iki kez seri porta yaz ──
  if (millis() - lastPrintAt > 500) {
    lastPrintAt = millis();
    Monitor.print("Isik: ");
    Monitor.print((int)smoothedLight);
    Monitor.print("   Esik: ");
    Monitor.print(threshold);
    Monitor.print("   LED: ");
    Monitor.println(litCount);
  }

  delay(20);   // ADC'ye nefes aldır, saniyede ~50 okuma yeterli
}
