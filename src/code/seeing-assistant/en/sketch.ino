/*
  Project 10 — Seeing, Speaking Assistant
  Arduino UNO Q  ·  sketch/sketch.ino

  What it does
    Sweeps a servo slowly left and right on patrol. When the Linux side spots a
    person it centres the servo and holds it there for a moment. The LED matrix
    shows what the system is currently doing.

  About the servo
    Its signal works at 3.3V, but take its power from an EXTERNAL 5V supply.
    The board's 5V pin cannot deliver the servo's stall current (up to 700 mA).
    The external supply's GND must be tied to the board's GND.
*/

#include <Arduino_RouterBridge.h>
#include <Arduino_LED_Matrix.h>
#include <Servo.h>

Arduino_LED_Matrix matrix;
Servo servo;

// ───────────────── Pin assignments ─────────────────
const int PIN_SERVO = 9;   // Signal wire of the externally powered servo

// ───────────────── Servo settings ─────────────────
const int ANGLE_MIN    = 30;
const int ANGLE_MAX    = 150;
const int ANGLE_CENTRE = 90;

// Patrol speed: degrees per step, and milliseconds between steps
const int STEP_DEGREES = 2;
const unsigned long STEP_MS = 40;

// How long to hold at the centre after spotting a person
const unsigned long ATTENTION_MS = 6000;

// ───────────────── The matrix ─────────────────
const uint8_t FRAME_ROWS = 8;
const uint8_t FRAME_COLS = 13;
const uint8_t FRAME_SIZE = FRAME_ROWS * FRAME_COLS;
uint8_t frame[FRAME_SIZE] = { 0 };

// ───────────────── State ─────────────────
int  angle = ANGLE_CENTRE;
int  direction = STEP_DEGREES;     // Positive sweeps right, negative left
unsigned long lastStepAt = 0;
unsigned long attentionUntil = 0;

unsigned long lastDrawAt = 0;
const unsigned long DRAW_MS = 100;

void setup() {
  Monitor.begin();

  servo.attach(PIN_SERVO);
  servo.write(ANGLE_CENTRE);

  matrix.begin();
  matrix.setGrayscaleBits(3);
  matrix.clear();

  Bridge.begin();
  Bridge.provide("servo_centre", servo_centre);
  Bridge.provide("servo_angle",  servo_angle);

  Monitor.println("Servo patrol started");
}

void loop() {
  patrol();
  drawIndicator();
}

// ───────────────── Called from Linux ─────────────────

// A person was seen: centre the servo and pay attention for a while
void servo_centre() {
  angle = ANGLE_CENTRE;
  servo.write(angle);
  attentionUntil = millis() + ATTENTION_MS;

  Monitor.println("Attention: centred");
}

// Move to a specific angle on request
void servo_angle(int degrees) {
  angle = constrain(degrees, ANGLE_MIN, ANGLE_MAX);
  servo.write(angle);
  attentionUntil = millis() + ATTENTION_MS;
}

// ───────────────── Patrol ─────────────────
// No delay(): each step happens when its time comes.
void patrol() {
  // Stay still while paying attention
  if (millis() < attentionUntil) return;

  if (millis() - lastStepAt < STEP_MS) return;
  lastStepAt = millis();

  angle += direction;

  // Reverse at the ends of the sweep
  if (angle >= ANGLE_MAX) { angle = ANGLE_MAX; direction = -STEP_DEGREES; }
  if (angle <= ANGLE_MIN) { angle = ANGLE_MIN; direction =  STEP_DEGREES; }

  servo.write(angle);
}

// ───────────────── The matrix indicator ─────────────────
void drawIndicator() {
  if (millis() - lastDrawAt < DRAW_MS) return;
  lastDrawAt = millis();

  memset(frame, 0, FRAME_SIZE);

  if (millis() < attentionUntil) {
    // Attention mode: draw an open eye in the middle
    for (int x = 4; x <= 8; x++) {
      setPixel(x, 2, 5);
      setPixel(x, 5, 5);
    }
    setPixel(3, 3, 5); setPixel(3, 4, 5);
    setPixel(9, 3, 5); setPixel(9, 4, 5);
    setPixel(6, 3, 7); setPixel(6, 4, 7);   // the pupil
  } else {
    // Patrol mode: a single dot showing the servo's angle
    int x = map(angle, ANGLE_MIN, ANGLE_MAX, 0, FRAME_COLS - 1);
    setPixel(x, 4, 4);
  }

  matrix.draw(frame);
}

void setPixel(int x, int y, uint8_t value) {
  if (x < 0 || x >= FRAME_COLS || y < 0 || y >= FRAME_ROWS) return;
  frame[y * FRAME_COLS + x] = value;
}
