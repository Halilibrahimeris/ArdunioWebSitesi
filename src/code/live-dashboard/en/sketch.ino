/*
  Project 8 — Live Sensor Dashboard
  Arduino UNO Q  ·  sketch/sketch.ino

  What it does
    Reads temperature and humidity from a DHT11 and light from an LDR, then
    sends every reading to the Linux side over Bridge. Linux both stores it
    and forwards it to the browser.

  This sketch looks a lot like project 5's — deliberately. What changed is on
  the Linux side: there we only stored the data, here we also broadcast it
  live. The microcontroller's job is the same in both: measure.
*/

#include <Arduino_RouterBridge.h>
#include <DHT.h>

// ───────────────── Pin assignments ─────────────────
const int PIN_DHT = 7;
const int PIN_LDR = A0;

DHT dht(PIN_DHT, DHT11);

// ───────────────── Settings ─────────────────
// Five seconds feels too sparse for a live chart; two seconds reads smoothly.
// Do not go below that — a DHT11 will not tolerate more than one reading a second.
const unsigned long SEND_INTERVAL_MS = 2000;

const int ADC_BITS = 10;
const int ADC_MAX  = 1023;

unsigned long lastSendAt = 0;

void setup() {
  Monitor.begin();
  Bridge.begin();

  analogReadResolution(ADC_BITS);
  dht.begin();

  Monitor.println("Sensor dashboard sketch ready");
}

void loop() {
  if (millis() - lastSendAt < SEND_INTERVAL_MS) return;
  lastSendAt = millis();

  float temperature = dht.readTemperature();
  float humidity    = dht.readHumidity();
  int   rawLight    = analogRead(PIN_LDR);

  if (isnan(temperature) || isnan(humidity)) {
    Monitor.println("DHT11 read failed, skipping this reading");
    return;
  }

  // Convert the raw ADC value to a percentage — 0-100 reads better in a browser
  int lightPercent = map(rawLight, 0, ADC_MAX, 0, 100);

  Bridge.notify("reading", temperature, humidity, lightPercent);
}
