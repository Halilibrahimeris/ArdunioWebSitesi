/*
  Proje 10 — Gören ve Konuşan Asistan
  Arduino UNO Q  ·  sketch/sketch.ino

  Ne yapar?
    Servo motoru yavaşça sağa sola gezdirir (devriye). Linux tarafı bir insan
    tespit ettiğinde servoyu ortaya alır ve kısa bir süre orada bekletir.
    LED matriste de sistemin ne yaptığını gösteren bir gösterge var.

  Servo hakkında:
    Sinyal 3.3V ile çalışır ama gücünü HARİCİ 5V'den al.
    Kartın 5V pini servonun kalkış akımını (700 mA'ya kadar) karşılayamaz.
    Harici beslemenin GND'si kartın GND'sine bağlanmalı.
*/

#include <Arduino_RouterBridge.h>
#include <Arduino_LED_Matrix.h>
#include <Servo.h>

Arduino_LED_Matrix matrix;
Servo servo;

// ───────────────── Pin tanımları ─────────────────
const int PIN_SERVO = 9;   // Harici 5V ile beslenen servonun sinyal ucu

// ───────────────── Servo ayarları ─────────────────
const int ACI_MIN    = 30;
const int ACI_MAX    = 150;
const int ACI_MERKEZ = 90;

// Devriye hızı: her adımda kaç derece, adımlar arası kaç milisaniye
const int ADIM_DERECE = 2;
const unsigned long ADIM_MS = 40;

// İnsan görüldükten sonra ne kadar süre merkezde beklesin
const unsigned long DIKKAT_MS = 6000;

// ───────────────── Matris ─────────────────
const uint8_t FRAME_ROWS = 8;
const uint8_t FRAME_COLS = 13;
const uint8_t FRAME_SIZE = FRAME_ROWS * FRAME_COLS;
uint8_t frame[FRAME_SIZE] = { 0 };

// ───────────────── Durum ─────────────────
int  aci = ACI_MERKEZ;
int  yon = ADIM_DERECE;      // Pozitifse sağa, negatifse sola
unsigned long sonAdimAt = 0;
unsigned long dikkatBitis = 0;

unsigned long sonCizimAt = 0;
const unsigned long CIZIM_MS = 100;

void setup() {
  Monitor.begin();

  servo.attach(PIN_SERVO);
  servo.write(ACI_MERKEZ);

  matrix.begin();
  matrix.setGrayscaleBits(3);
  matrix.clear();

  Bridge.begin();
  Bridge.provide("servo_merkez", servo_merkez);
  Bridge.provide("servo_aci",    servo_aci);

  Monitor.println("Servo devriyesi basladi");
}

void loop() {
  devriye();
  cizGosterge();
}

// ───────────────── Linux'tan çağrılan ─────────────────

// İnsan görüldüğünde: servoyu ortaya al ve bir süre dikkat kesil
void servo_merkez() {
  aci = ACI_MERKEZ;
  servo.write(aci);
  dikkatBitis = millis() + DIKKAT_MS;

  Monitor.println("Dikkat: merkeze alindi");
}

// İstenirse belirli bir açıya götür
void servo_aci(int derece) {
  aci = constrain(derece, ACI_MIN, ACI_MAX);
  servo.write(aci);
  dikkatBitis = millis() + DIKKAT_MS;
}

// ───────────────── Devriye ─────────────────
// delay() yok: her adım zamanı gelince atılıyor.
void devriye() {
  // Dikkat modundayken hareket etme
  if (millis() < dikkatBitis) return;

  if (millis() - sonAdimAt < ADIM_MS) return;
  sonAdimAt = millis();

  aci += yon;

  // Uçlara gelince yönü çevir
  if (aci >= ACI_MAX) { aci = ACI_MAX; yon = -ADIM_DERECE; }
  if (aci <= ACI_MIN) { aci = ACI_MIN; yon =  ADIM_DERECE; }

  servo.write(aci);
}

// ───────────────── Matris göstergesi ─────────────────
void cizGosterge() {
  if (millis() - sonCizimAt < CIZIM_MS) return;
  sonCizimAt = millis();

  memset(frame, 0, FRAME_SIZE);

  if (millis() < dikkatBitis) {
    // Dikkat modu: ortada açık bir göz çiz
    for (int x = 4; x <= 8; x++) {
      setPixel(x, 2, 5);
      setPixel(x, 5, 5);
    }
    setPixel(3, 3, 5); setPixel(3, 4, 5);
    setPixel(9, 3, 5); setPixel(9, 4, 5);
    setPixel(6, 3, 7); setPixel(6, 4, 7);   // göz bebeği
  } else {
    // Devriye modu: servonun açısını gösteren tek nokta
    int x = map(aci, ACI_MIN, ACI_MAX, 0, FRAME_COLS - 1);
    setPixel(x, 4, 4);
  }

  matrix.draw(frame);
}

void setPixel(int x, int y, uint8_t value) {
  if (x < 0 || x >= FRAME_COLS || y < 0 || y >= FRAME_ROWS) return;
  frame[y * FRAME_COLS + x] = value;
}
