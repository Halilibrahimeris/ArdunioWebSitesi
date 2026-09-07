/*
  Project 1 — Traffic Light
  Arduino UNO Q  ·  sketch/sketch.ino  (runs on the STM32 microcontroller)

  What it does
    A traffic light cycling red → red+amber → green → amber.
    Pressing the button registers a pedestrian request and cuts the green short.
    The onboard 8x13 LED matrix draws a miniature copy of the light on your
    breadboard; the bar on the right edge shows how much of the phase is left.

  Important: every pin on this board runs at 3.3V. Never wire an LED without a
  220 ohm resistor — you would damage both the LED and the pin.
*/

#include <Arduino_RouterBridge.h>   // For Monitor (the App Lab serial monitor)
#include <Arduino_LED_Matrix.h>

Arduino_LED_Matrix matrix;

// ───────────────── The LED matrix ─────────────────
// The matrix is 8 rows by 13 columns. We keep the pixels in a flat array;
// the pixel at (x, y) lives at index y * 13 + x
const uint8_t FRAME_ROWS = 8;
const uint8_t FRAME_COLS = 13;
const uint8_t FRAME_SIZE = FRAME_ROWS * FRAME_COLS;   // 104 pixels

uint8_t frame[FRAME_SIZE] = { 0 };

// With setGrayscaleBits(3) the brightness runs from 0 to 7. 7 is brightest.
const uint8_t BRIGHT = 7;
const uint8_t DIM    = 2;

// ───────────────── Pin assignments ─────────────────
const int PIN_RED    = 2;   // Red LED    (+ 220 ohm)
const int PIN_YELLOW = 3;   // Amber LED  (+ 220 ohm)
const int PIN_GREEN  = 4;   // Green LED  (+ 220 ohm)
const int PIN_BUTTON = 7;   // Button     (+ 10k pull-down resistor)

// ───────────────── Light phases ─────────────────
// Order: RED → RED+AMBER → GREEN → AMBER → (wrap around)
enum Phase { PHASE_RED, PHASE_RED_YELLOW, PHASE_GREEN, PHASE_YELLOW };
const int PHASE_COUNT = 4;

// Normal duration of each phase, in milliseconds
const unsigned long PHASE_MS[PHASE_COUNT] = { 6000, 1500, 6000, 2000 };

// ───────────────── State ─────────────────
int           currentPhase     = PHASE_RED;
unsigned long phaseStartedAt   = 0;      // When did this phase begin?
bool          pedestrianWaiting = false;

// Button debouncing
bool          lastButtonReading = false;
unsigned long lastButtonChange  = 0;
const unsigned long DEBOUNCE_MS = 40;

// How much longer green may stay on once a pedestrian is waiting
const unsigned long GREEN_CUTOFF_MS = 1500;

// Refresh the matrix about 20 times a second rather than every loop
unsigned long lastDrawAt = 0;
const unsigned long DRAW_INTERVAL_MS = 50;

void setup() {
  Monitor.begin();   // So we can print to App Lab's serial monitor

  pinMode(PIN_RED,    OUTPUT);
  pinMode(PIN_YELLOW, OUTPUT);
  pinMode(PIN_GREEN,  OUTPUT);
  pinMode(PIN_BUTTON, INPUT);   // We use an external 10k pull-down resistor

  matrix.begin();
  matrix.setGrayscaleBits(3);   // Brightness from 0 to 7 per pixel
  matrix.clear();

  phaseStartedAt = millis();
  applyPhase();

  Monitor.println("Traffic light started");
}

void loop() {
  readButton();      // Read the button on every pass
  updatePhase();     // Advance the phase once its time is up
  drawMatrix();      // Refresh the matrix
}

// ───────────────── Read the button ─────────────────
// We do NOT use delay(): while delay() waits, button presses would be missed.
void readButton() {
  bool reading = (digitalRead(PIN_BUTTON) == HIGH);

  // The signal changed — restart the settling timer
  if (reading != lastButtonReading) {
    lastButtonChange  = millis();
    lastButtonReading = reading;
    return;
  }

  // The signal held steady long enough, so this is a real press
  if (reading && (millis() - lastButtonChange) > DEBOUNCE_MS) {
    if (!pedestrianWaiting) {
      pedestrianWaiting = true;
      Monitor.println("Pedestrian request received");
    }
  }
}

// ───────────────── How long this phase lasts ─────────────────
unsigned long currentPhaseDuration() {
  unsigned long limit = PHASE_MS[currentPhase];

  // Cut the green short when someone is waiting to cross
  if (currentPhase == PHASE_GREEN && pedestrianWaiting && limit > GREEN_CUTOFF_MS) {
    limit = GREEN_CUTOFF_MS;
  }
  return limit;
}

// ───────────────── Advance the phase ─────────────────
void updatePhase() {
  if (millis() - phaseStartedAt < currentPhaseDuration()) {
    return;                          // Not yet
  }

  currentPhase   = (currentPhase + 1) % PHASE_COUNT;
  phaseStartedAt = millis();

  // Reaching red means the pedestrian request has been served
  if (currentPhase == PHASE_RED) {
    pedestrianWaiting = false;
  }

  applyPhase();
}

// ───────────────── Update the breadboard LEDs ─────────────────
void applyPhase() {
  digitalWrite(PIN_RED,    currentPhase == PHASE_RED || currentPhase == PHASE_RED_YELLOW);
  digitalWrite(PIN_YELLOW, currentPhase == PHASE_RED_YELLOW || currentPhase == PHASE_YELLOW);
  digitalWrite(PIN_GREEN,  currentPhase == PHASE_GREEN);
}

// ───────────────── Set a single pixel ─────────────────
// x: 0-12 (column), y: 0-7 (row), value: 0-7 (brightness)
void setPixel(int x, int y, uint8_t value) {
  if (x < 0 || x >= FRAME_COLS || y < 0 || y >= FRAME_ROWS) return;   // Off screen
  frame[y * FRAME_COLS + x] = value;
}

// Draws a 3x2 lamp with its top-left corner at (x, y)
void drawLamp(int x, int y, bool on) {
  uint8_t value = on ? BRIGHT : 0;
  for (int dx = 0; dx < 3; dx++) {
    for (int dy = 0; dy < 2; dy++) {
      setPixel(x + dx, y + dy, value);
    }
  }
}

// ───────────────── Draw a miniature traffic light ─────────────────
void drawMatrix() {
  if (millis() - lastDrawAt < DRAW_INTERVAL_MS) return;
  lastDrawAt = millis();

  // Clear the frame
  memset(frame, 0, FRAME_SIZE);

  // Three lamps, each 3 pixels wide and 2 pixels tall
  drawLamp(2, 0, currentPhase == PHASE_RED || currentPhase == PHASE_RED_YELLOW);
  drawLamp(2, 3, currentPhase == PHASE_RED_YELLOW || currentPhase == PHASE_YELLOW);
  drawLamp(2, 6, currentPhase == PHASE_GREEN);

  // A vertical bar on the right edge counting down the phase
  unsigned long elapsed = millis() - phaseStartedAt;
  unsigned long total   = currentPhaseDuration();
  int remainingRows = FRAME_ROWS - (int)((elapsed * FRAME_ROWS) / total);
  for (int y = 0; y < remainingRows; y++) {
    setPixel(FRAME_COLS - 1, FRAME_ROWS - 1 - y, DIM);
  }

  // A blinking dot in the top-left while a pedestrian is waiting
  if (pedestrianWaiting && (millis() / 400) % 2 == 0) {
    setPixel(0, 0, BRIGHT);
  }

  // Push the frame we built to the display
  matrix.draw(frame);
}
