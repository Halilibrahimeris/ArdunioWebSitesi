/*
  Proje 5 — Veri Kaydedici
  Arduino UNO Q  ·  sketch/sketch.ino  (STM32 mikrodenetleyicide çalışır)

  Ne yapar?
    DHT11'den sıcaklık ve nem, LDR'den ışık seviyesi okur.
    Her ölçümü Bridge üzerinden Linux tarafındaki Python koduna gönderir.

  Bu sketch hiçbir şey KAYDETMİYOR. Görevi yalnızca ölçmek.
  Kaydetme işi Linux tarafında, çünkü orada dosya sistemi ve veritabanı var.
*/

#include <Arduino_RouterBridge.h>
#include <DHT.h>

// ───────────────── Pin tanımları ─────────────────
const int PIN_DHT = 7;    // 4. projedeki bağlantının aynısı
const int PIN_LDR = A0;   // 2. projedeki bağlantının aynısı

DHT dht(PIN_DHT, DHT11);

// ───────────────── Ayarlar ─────────────────
// Kaç saniyede bir kayıt gönderelim?
// Çok sık gönderirsen veritabanı gereksiz şişer; çok seyrek gönderirsen
// kısa süreli değişimleri kaçırırsın.
const unsigned long SEND_INTERVAL_MS = 5000;

const int ADC_BITS = 10;
const int ADC_MAX  = 1023;

// 2. projede LDR_INVERTED = true yaptıysan (ters çalışan ışık sensörü kartı)
// burada da true yap.
const bool LDR_INVERTED = false;

unsigned long lastSendAt = 0;

void setup() {
  Monitor.begin();

  // Linux tarafıyla köprüyü kur. Bu satır olmadan Bridge.notify hiçbir şey yapmaz.
  Bridge.begin();

  analogReadResolution(ADC_BITS);
  dht.begin();

  Monitor.println("Sketch hazir. Olcumler Bridge uzerinden gonderilecek.");
}

void loop() {
  if (millis() - lastSendAt < SEND_INTERVAL_MS) return;
  lastSendAt = millis();

  float sicaklik = dht.readTemperature();
  float nem      = dht.readHumidity();
  int   isik     = analogRead(PIN_LDR);
  if (LDR_INVERTED) isik = ADC_MAX - isik;   // Ters kartta da 0 = karanlık olsun

  // DHT11 arada okuma kaçırır. Bozuk veriyi göndermenin anlamı yok —
  // bir sonraki turda tekrar deneriz.
  if (isnan(sicaklik) || isnan(nem)) {
    Monitor.println("DHT11 okunamadi, bu olcum atlandi");
    return;
  }

  // ── Linux tarafındaki fonksiyonu çağır ──
  // "kayit_al" metni, main.py içindeki Bridge.provide çağrısındakiyle
  // BİREBİR aynı olmalı.
  //
  // notify() cevap beklemez: veriyi gönderir ve hemen devam eder.
  // Sensör verisi akıtmak için istediğimiz davranış tam olarak budur.
  Bridge.notify("kayit_al", sicaklik, nem, isik);

  Monitor.print("Gonderildi -> ");
  Monitor.print(sicaklik, 1);
  Monitor.print(" C, %");
  Monitor.print(nem, 0);
  Monitor.print(", isik ");
  Monitor.println(isik);
}
