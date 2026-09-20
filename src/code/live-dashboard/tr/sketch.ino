/*
  Proje 8 — Canlı Sensör Paneli
  Arduino UNO Q  ·  sketch/sketch.ino

  Ne yapar?
    DHT11'den sıcaklık ve nem, LDR'den ışık okur ve her ölçümü Bridge ile
    Linux tarafına gönderir. Linux hem kaydeder hem tarayıcıya iletir.

  Bu sketch 5. projedekine çok benziyor — bilerek. Değişen kısım Linux
  tarafında: orada veriyi sadece kaydediyorduk, burada canlı olarak da
  yayınlıyoruz. Mikrodenetleyicinin görevi ikisinde de aynı: ölçmek.
*/

#include <Arduino_RouterBridge.h>
#include <DHT.h>

// ───────────────── Pin tanımları ─────────────────
const int PIN_DHT = 7;
const int PIN_LDR = A0;

DHT dht(PIN_DHT, DHT11);

// ───────────────── Ayarlar ─────────────────
// Canlı grafik için 5 saniye çok seyrek kalır; 2 saniye akıcı görünüyor.
// DHT11 saniyede birden fazla okumaya izin vermediği için altına inme.
const unsigned long SEND_INTERVAL_MS = 2000;

const int ADC_BITS = 10;
const int ADC_MAX  = 1023;

// 2. projede LDR_INVERTED = true yaptıysan (ters çalışan ışık sensörü kartı)
// burada da true yap.
const bool LDR_INVERTED = false;

unsigned long lastSendAt = 0;

void setup() {
  Monitor.begin();
  Bridge.begin();

  analogReadResolution(ADC_BITS);
  dht.begin();

  Monitor.println("Sensor paneli sketch'i hazir");
}

void loop() {
  if (millis() - lastSendAt < SEND_INTERVAL_MS) return;
  lastSendAt = millis();

  float sicaklik = dht.readTemperature();
  float nem      = dht.readHumidity();
  int   hamIsik  = analogRead(PIN_LDR);
  if (LDR_INVERTED) hamIsik = ADC_MAX - hamIsik;   // Ters kartta da 0 = karanlık olsun

  if (isnan(sicaklik) || isnan(nem)) {
    Monitor.println("DHT11 okunamadi, bu olcum atlandi");
    return;
  }

  // Ham ADC değerini yüzdeye çevir — tarayıcıda 0-100 aralığı daha anlaşılır
  int isikYuzde = map(hamIsik, 0, ADC_MAX, 0, 100);

  Bridge.notify("olcum", sicaklik, nem, isikYuzde);
}
