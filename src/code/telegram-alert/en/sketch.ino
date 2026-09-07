/*
  Project 9 — Telegram Bot
  Arduino UNO Q  ·  sketch/sketch.ino

  What it does
    Tells the Linux side whenever the HC-SR501 PIR sensor detects motion.
    Also draws a small activity indicator on the board's LED matrix.

  About the PIR sensor
    It runs on 5V but its output is 3.3V TTL, so it connects directly with no
    voltage divider. (That is what makes it different from project 3's HC-SR04.)
*/

#include <Arduino_RouterBridge.h>
#include <Arduino_LED_Matrix.h>

Arduino_LED_Matrix matrix;

// ───────────────── Pin assignments ─────────────────
const int PIN_PIR = 2;

// ───────────────── The matrix ─────────────────
const uint8_t FRAME_ROWS = 8;
const uint8_t FRAME_COLS = 13;
const uint8_t FRAME_SIZE = FRAME_ROWS * FRAME_COLS;
uint8_t frame[FRAME_SIZE] = { 0 };

// ───────────────── State ─────────────────
bool lastMotion = false;

// A PIR sensor stays HIGH for a while after triggering. A cooldown stops us
// counting one movement many times over.
const unsigned long COOLDOWN_MS = 5000;
unsigned long lastReportAt = 0;

// How long the indicator stays lit after motion
const unsigned long INDICATOR_MS = 3000;
unsigned long indicatorUntil = 0;

unsigned long lastDrawAt = 0;
const unsigned long DRAW_INTERVAL_MS = 100;

void setup() {
  Monitor.begin();

  pinMode(PIN_PIR, INPUT);

  matrix.begin();
  matrix.setGrayscaleBits(3);
  matrix.clear();

  Bridge.begin();

  Monitor.println("PIR sensor warming up, give it 30 seconds...");
}

void loop() {
  checkMotion();
  drawIndicator();
}

// ───────────────── Check for motion ─────────────────
void checkMotion() {
  bool motion = (digitalRead(PIN_PIR) == HIGH);

  // Only report the START of a new movement (a rising edge)
  if (motion && !lastMotion) {
    // Do not report the same event again during the cooldown
    if (millis() - lastReportAt >= COOLDOWN_MS) {
      lastReportAt = millis();
      indicatorUntil = millis() + INDICATOR_MS;

      // Tell the Linux side
      Bridge.notify("motion", 1);

      Monitor.println("Motion detected");
    }
  }

  lastMotion = motion;
}

// ───────────────── The matrix indicator ─────────────────
// Draws a blinking exclamation mark while motion is being reported.
void drawIndicator() {
  if (millis() - lastDrawAt < DRAW_INTERVAL_MS) return;
  lastDrawAt = millis();

  memset(frame, 0, FRAME_SIZE);

  bool active = millis() < indicatorUntil;

  if (active && (millis() / 300) % 2 == 0) {
    // An exclamation mark in the middle: a stem and a dot
    for (int y = 1; y <= 4; y++) {
      setPixel(6, y, 7);
    }
    setPixel(6, 6, 7);
  } else if (!active) {
    // A dim dot in the corner while idle — the system is alive
    setPixel(0, 7, 1);
  }

  matrix.draw(frame);
}

void setPixel(int x, int y, uint8_t value) {
  if (x < 0 || x >= FRAME_COLS || y < 0 || y >= FRAME_ROWS) return;
  frame[y * FRAME_COLS + x] = value;
}
