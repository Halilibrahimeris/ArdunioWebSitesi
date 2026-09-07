/*
  Project 3 — Parking Sensor
  Arduino UNO Q  ·  sketch/sketch.ino

  What it does
    An HC-SR04 ultrasonic sensor measures how far away an obstacle is.
    The closer it gets, the faster the buzzer beeps and the further the LEDs
    shift toward red. Below 30 cm the tone becomes continuous — stop the car.

  ┌──────────────────────────────────────────────────────────────┐
  │  WARNING: the HC-SR04's ECHO pin outputs 5V.                 │
  │  Wire ECHO straight to D9 and you permanently damage the pin.│
  │  A 2.2k + 3.3k voltage divider in between is MANDATORY.      │
  └──────────────────────────────────────────────────────────────┘
*/

#include <Arduino_RouterBridge.h>   // Monitor / App Lab serial monitor

// ───────────────── Pin assignments ─────────────────
const int PIN_TRIG   = 10;  // To the sensor   (board → sensor, 3.3V is enough)
const int PIN_ECHO   = 9;   // From the sensor (THROUGH THE VOLTAGE DIVIDER!)
const int PIN_BUZZER = 8;

const int PIN_GREEN  = 4;
const int PIN_YELLOW = 3;
const int PIN_RED    = 2;

// ───────────────── Distance thresholds (cm) ─────────────────
const float DIST_FAR    = 100.0;  // Beyond this is "far" — no beeping
const float DIST_NEAR   = 50.0;   // Start of the amber zone
const float DIST_DANGER = 30.0;   // Red zone — continuous tone
const float DIST_MAX    = 400.0;  // The HC-SR04's upper limit

// ───────────────── Beep settings ─────────────────
const int BEEP_TONE      = 800;   // Beep frequency (Hz)
const int BEEP_LENGTH_MS = 60;    // How long each beep lasts
const int BEEP_GAP_MIN   = 60;    // Shortest gap between beeps (close up)
const int BEEP_GAP_MAX   = 900;   // Longest gap (far away)

// ───────────────── Timing ─────────────────
const unsigned long MEASURE_INTERVAL_MS = 60;    // Wait between measurements
const unsigned long ECHO_TIMEOUT_US     = 25000; // Roughly 4 m

unsigned long lastMeasureAt = 0;
unsigned long lastBeepAt    = 0;
bool          beeping       = false;

float distanceCm = DIST_MAX;   // The last valid measurement

void setup() {
  Monitor.begin();

  pinMode(PIN_TRIG, OUTPUT);
  pinMode(PIN_ECHO, INPUT);
  pinMode(PIN_BUZZER, OUTPUT);
  pinMode(PIN_GREEN, OUTPUT);
  pinMode(PIN_YELLOW, OUTPUT);
  pinMode(PIN_RED, OUTPUT);

  digitalWrite(PIN_TRIG, LOW);
}

void loop() {
  measureDistance();
  updateLeds();
  updateBuzzer();
}

// ───────────────── Measure the distance ─────────────────
void measureDistance() {
  if (millis() - lastMeasureAt < MEASURE_INTERVAL_MS) return;
  lastMeasureAt = millis();

  // Trigger the sensor with a 10 microsecond pulse
  digitalWrite(PIN_TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(PIN_TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(PIN_TRIG, LOW);

  // Measure how long the ECHO pin stays HIGH
  unsigned long echoUs = pulseIn(PIN_ECHO, HIGH, ECHO_TIMEOUT_US);

  if (echoUs == 0) {
    // Timed out: nothing within range
    distanceCm = DIST_MAX;
    return;
  }

  // Sound travels about 343 m per second = 0.0343 cm/µs.
  // The pulse goes out and comes back, so we halve the total distance.
  distanceCm = (echoUs * 0.0343) / 2.0;

  Monitor.print("Distance: ");
  Monitor.print(distanceCm, 1);
  Monitor.println(" cm");
}

// ───────────────── Update the LEDs ─────────────────
void updateLeds() {
  digitalWrite(PIN_GREEN,  distanceCm >= DIST_NEAR);
  digitalWrite(PIN_YELLOW, distanceCm < DIST_NEAR && distanceCm >= DIST_DANGER);
  digitalWrite(PIN_RED,    distanceCm < DIST_DANGER);
}

// ───────────────── Update the buzzer ─────────────────
// The beep interval tracks the distance, without ever calling delay().
void updateBuzzer() {
  // Far away: stay quiet
  if (distanceCm >= DIST_FAR) {
    noTone(PIN_BUZZER);
    beeping = false;
    return;
  }

  // Danger zone: a continuous tone
  if (distanceCm < DIST_DANGER) {
    tone(PIN_BUZZER, BEEP_TONE);
    beeping = true;
    return;
  }

  // In between: the closer it gets, the shorter the gap
  int gap = (int)mapFloat(distanceCm, DIST_DANGER, DIST_FAR, BEEP_GAP_MIN, BEEP_GAP_MAX);

  unsigned long now = millis();

  if (beeping && now - lastBeepAt >= (unsigned long)BEEP_LENGTH_MS) {
    noTone(PIN_BUZZER);
    beeping = false;
    lastBeepAt = now;
  } else if (!beeping && now - lastBeepAt >= (unsigned long)gap) {
    tone(PIN_BUZZER, BEEP_TONE);
    beeping = true;
    lastBeepAt = now;
  }
}

// map() works on integers; here is our own version for a fractional distance
float mapFloat(float value, float inMin, float inMax, float outMin, float outMax) {
  if (value < inMin) value = inMin;
  if (value > inMax) value = inMax;
  return (value - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
}
