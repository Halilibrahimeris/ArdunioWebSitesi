/*
  Project 6 — Distance-Controlled Web Game
  Arduino UNO Q  ·  sketch/sketch.ino

  What does it do?
    Measures how far your hand is with an HC-SR04. Every measurement sends TWO
    values: the raw reading and the average of the last few readings. The game
    in the browser draws both; you decide which one the balloon follows.

  This sketch uses project 3's circuit EXACTLY — you do not have to move a
  single wire. What changes is the code. Even the meaning of the LEDs changed:
  in project 3 they showed distance, here they show how far you are from the
  target band.

  Directions:
    microcontroller → Bridge.notify("reading", ...)   → Linux   (measurement)
    Linux → Bridge.call("set_target" / "beep_success") → microcontroller

  ┌──────────────────────────────────────────────────────────────┐
  │  WARNING: the HC-SR04's ECHO pin outputs 5V.                 │
  │  Wiring ECHO straight to D9 puts that pin at risk.           │
  │  A 2.2k + 3.3k voltage divider is MANDATORY.                 │
  └──────────────────────────────────────────────────────────────┘
*/

#include <Arduino_RouterBridge.h>
#include <Arduino_LED_Matrix.h>

// ───────────────── Pins (same as project 3) ─────────────────
const int PIN_TRIG   = 10;  // Goes to the sensor (board → sensor, 3.3V is fine)
const int PIN_ECHO   = 9;   // Comes from the sensor (THROUGH THE DIVIDER!)
const int PIN_BUZZER = 8;   // Passive buzzer, or a buzzer module's S pin (+ 220 ohm in series)

const int PIN_GREEN  = 4;
const int PIN_YELLOW = 3;
const int PIN_RED    = 2;

// ───────────────── Play area ─────────────────
// The distance range between the balloon's floor and ceiling.
// You move your hand above the sensor inside this range.
const float PLAY_MIN = 5.0;    // cm — balloon at the bottom
const float PLAY_MAX = 60.0;   // cm — balloon at the top

// ───────────────── Measuring ─────────────────
const unsigned long MEASURE_INTERVAL_MS = 60;   // Wait between measurements

// In project 3 this was 25000 (~4 m). Here the play area never exceeds 60 cm,
// and pulseIn BLOCKS for the whole timeout — 25 ms is nearly half of the 60 ms
// budget. 12000 µs (~2 m) is more than enough and leaves the loop room to breathe.
const unsigned long ECHO_TIMEOUT_US = 12000;

// ───────────────── Moving average ─────────────────
// A ring buffer: we keep the last WINDOW_MAX readings but average only the
// newest "window" of them. With window = 1 there is NO average — it is the raw
// reading itself, and the slider in the interface is what changes this.
//
// Project 2 used an exponential average (EMA); this is a true moving average.
// An EMA keeps one number but never fully forgets old readings; this one gives
// every reading in the window equal weight and forgets everything outside it.
const int WINDOW_MAX = 9;
float samples[WINDOW_MAX];
int   sampleCount = 0;   // How many readings we have while the buffer fills
int   sampleIndex = 0;   // Where the next one goes
int   window      = 5;   // How many readings to average

float rawCm = PLAY_MAX;
float avgCm = PLAY_MAX;

// ───────────────── Target band ─────────────────
// The browser sends the target once per round; the board drives the LEDs and
// the matrix from its own readings. That way we never make a network round
// trip per frame.
float targetNear = 0.0;   // cm — bottom edge of the band
float targetFar  = 0.0;   // cm — top edge of the band
bool  hasTarget  = false;

const float NEAR_MARGIN_CM = 8.0;  // Yellow lights up within this much of the band

// For the progress bar on the matrix. Display only — the browser is the one
// and only referee for scoring.
unsigned long inZoneSince = 0;
const unsigned long HOLD_MS = 2000;

// ───────────────── Buzzer ─────────────────
// Set this to true if you use a 3-pin buzzer module whose little transistor
// is marked 8550 or 9012.
const bool BUZZER_ACTIVE_LOW = false;

// Victory tune — stepped note by note so it never blocks.
const int NOTES[]     = { 880, 1175, 1568 };
const int NOTE_COUNT  = 3;
const int NOTE_MS     = 110;
int  noteIndex = NOTE_COUNT;   // NOTE_COUNT = not playing
unsigned long noteStartedAt = 0;

// ───────────────── LED matrix ─────────────────
Arduino_LED_Matrix matrix;

const uint8_t FRAME_ROWS = 8;
const uint8_t FRAME_COLS = 13;
const uint8_t FRAME_SIZE = FRAME_ROWS * FRAME_COLS;

uint8_t frame[FRAME_SIZE] = { 0 };

const unsigned long DRAW_INTERVAL_MS = 100;  // The matrix refreshes 10 times a second

// So you can switch one off and retry if the matrix or the buzzer misbehaves.
const bool MATRIX_ENABLED = true;
const bool BEEP_ENABLED   = true;

// ───────────────── Timers ─────────────────
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
  matrix.setGrayscaleBits(3);   // 0-7 brightness per pixel
  matrix.clear();

  Bridge.begin();

  // Functions the Linux side is allowed to call.
  // These names must match the Bridge.call calls in main.py EXACTLY.
  Bridge.provide("set_target",   set_target);
  Bridge.provide("clear_target", clear_target);
  Bridge.provide("set_window",   set_window);
  Bridge.provide("beep_success", beep_success);

  Monitor.println("Distance game ready.");
}

void loop() {
  measureDistance();
  updateLeds();
  updateBuzzer();
  updateMatrix();
}

// ───────────────── Commands from Linux ─────────────────

// Distances arrive in millimetres: 20.0 cm = 200.
// Sending whole numbers removes every question about decimal formats on the bridge.
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

// ───────────────── Measuring ─────────────────

void measureDistance() {
  if (millis() - lastMeasureAt < MEASURE_INTERVAL_MS) return;
  lastMeasureAt = millis();

  // Trigger the sensor: send a 10 microsecond pulse
  digitalWrite(PIN_TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(PIN_TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(PIN_TRIG, LOW);

  unsigned long echoUs = pulseIn(PIN_ECHO, HIGH, ECHO_TIMEOUT_US);

  if (echoUs == 0) {
    // Timed out: no hand in range, leave the balloon at the ceiling
    rawCm = PLAY_MAX;
  } else {
    // Sound travels about 343 m per second = 0.0343 cm/µs.
    // The signal goes there and back, so we halve the total distance.
    rawCm = (echoUs * 0.0343) / 2.0;
  }

  rawCm = constrain(rawCm, PLAY_MIN, PLAY_MAX);
  avgCm = pushSample(rawCm);

  // CAREFUL: do NOT put a Monitor.println() here.
  // There are ~17 measurements a second; printing each one floods the monitor
  // and slows the loop down. While debugging, print a single reading, then delete it.

  // We send BOTH values so the browser can draw both and show you
  // the difference between them.
  Bridge.notify("reading", rawCm, avgCm);
}

// Writes the new reading into the ring buffer and returns the average
// of the newest "window" readings.
float pushSample(float value) {
  samples[sampleIndex] = value;
  sampleIndex = (sampleIndex + 1) % WINDOW_MAX;
  if (sampleCount < WINDOW_MAX) sampleCount++;

  int count = min(window, sampleCount);
  float total = 0;

  // Walk backwards from the newest reading and add "count" of them
  for (int i = 0; i < count; i++) {
    int index = (sampleIndex - 1 - i + WINDOW_MAX) % WINDOW_MAX;
    total += samples[index];
  }

  return total / count;
}

// ───────────────── LEDs ─────────────────

void updateLeds() {
  if (!hasTarget) return;

  // The LED decision uses the averaged value too. Whatever the browser moves
  // the balloon with, the board should light its LEDs with — if the two look
  // at different numbers you get the baffling "the green LED is on but I am
  // not scoring" situation.
  float error = 0;
  if (avgCm < targetNear)     error = targetNear - avgCm;
  else if (avgCm > targetFar) error = avgCm - targetFar;

  bool inZone = (error == 0);

  digitalWrite(PIN_GREEN,  inZone);
  digitalWrite(PIN_YELLOW, !inZone && error <= NEAR_MARGIN_CM);
  digitalWrite(PIN_RED,    error > NEAR_MARGIN_CM);

  // Count how long you have stayed in the band, for the matrix progress bar.
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

// ───────────────── LED matrix ─────────────────
//
// The matrix is 13 columns wide and 8 rows high. Instead of writing numbers we
// draw the game itself: a target bracket on both edges, the balloon in the
// middle, and a bar along the bottom showing how long you have held the band.
// A level meter across 8 rows reads far better than a three-digit number —
// and you can play without looking at the screen at all.

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

// The target band: a bracket in the leftmost and rightmost columns
void drawBracket() {
  int topRow    = rowOf(targetFar);
  int bottomRow = rowOf(targetNear);

  for (int y = topRow; y <= bottomRow; y++) {
    setPixel(0, y, 3);
    setPixel(FRAME_COLS - 1, y, 3);
  }
}

// The balloon: a block three columns wide and two rows high in the middle
void drawBalloon() {
  int row = rowOf(avgCm);

  for (int x = 5; x <= 7; x++) {
    setPixel(x, row, 7);
    setPixel(x, row + 1, 4);
  }
}

// Bottom row: the bar grows across as the time held in the band runs out
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

// Turns a distance into a matrix row: far = top row (0), near = bottom row (7).
int rowOf(float cm) {
  float ratio = (cm - PLAY_MIN) / (PLAY_MAX - PLAY_MIN);
  int row = (int)round((1.0 - ratio) * (FRAME_ROWS - 1));
  return constrain(row, 0, FRAME_ROWS - 1);
}
