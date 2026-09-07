/*
  Project 5 — Data Logger
  Arduino UNO Q  ·  sketch/sketch.ino  (runs on the STM32 microcontroller)

  What it does
    Reads temperature and humidity from a DHT11 and a light level from an LDR.
    Sends every reading to the Python code on the Linux side over Bridge.

  This sketch STORES nothing. Its only job is to measure.
  Storing happens on the Linux side, where the file system and database live.
*/

#include <Arduino_RouterBridge.h>
#include <DHT.h>

// ───────────────── Pin assignments ─────────────────
const int PIN_DHT = 7;    // Same wiring as project 4
const int PIN_LDR = A0;   // Same wiring as project 2

DHT dht(PIN_DHT, DHT11);

// ───────────────── Settings ─────────────────
// How often should we send a reading?
// Too often and the database bloats for nothing; too rarely and you miss
// short-lived changes.
const unsigned long SEND_INTERVAL_MS = 5000;

const int ADC_BITS = 10;

unsigned long lastSendAt = 0;

void setup() {
  Monitor.begin();

  // Open the bridge to the Linux side. Without this line Bridge.notify does nothing.
  Bridge.begin();

  analogReadResolution(ADC_BITS);
  dht.begin();

  Monitor.println("Sketch ready. Readings will be sent over Bridge.");
}

void loop() {
  if (millis() - lastSendAt < SEND_INTERVAL_MS) return;
  lastSendAt = millis();

  float temperature = dht.readTemperature();
  float humidity    = dht.readHumidity();
  int   light       = analogRead(PIN_LDR);

  // The DHT11 drops a reading now and then. There is no point sending broken
  // data — we simply try again on the next pass.
  if (isnan(temperature) || isnan(humidity)) {
    Monitor.println("DHT11 read failed, skipping this reading");
    return;
  }

  // ── Call the function on the Linux side ──
  // The string "store_reading" must match the one in main.py's Bridge.provide
  // call EXACTLY.
  //
  // notify() does not wait for a reply: it sends the data and moves on.
  // For streaming sensor readings that is exactly the behaviour we want.
  Bridge.notify("store_reading", temperature, humidity, light);

  Monitor.print("Sent -> ");
  Monitor.print(temperature, 1);
  Monitor.print(" C, ");
  Monitor.print(humidity, 0);
  Monitor.print("%, light ");
  Monitor.println(light);
}
