/*
  Project 2 — Light and Sound Meter
  Arduino UNO Q  ·  sketch/sketch.ino

  What it does
    An LDR measures the ambient light. A bar of five LEDs shows the level.
    A potentiometer sets an alarm threshold; when the light drops below it the
    buzzer sounds, and its pitch falls as the room gets darker.

  This project introduces the analog world: a pin no longer reads just 0 or 1,
  but a number in between.
*/

#include <Arduino_RouterBridge.h>   // Monitor / App Lab serial monitor

// ───────────────── Pin assignments ─────────────────
const int PIN_LDR    = A0;   // LDR + 10k voltage divider, or a light sensor module's S/AO pin
const int PIN_POT    = A1;   // Potentiometer wiper
const int PIN_BUZZER = 8;    // Passive buzzer, or a buzzer module's S pin (+ 220 ohm series resistor)

// LED bar: five LEDs left to right (each with a 220 ohm resistor)
const int LED_PINS[]  = { 2, 3, 4, 5, 6 };
const int LED_COUNT   = 5;

// ───────────────── Settings ─────────────────
// We state the ADC resolution EXPLICITLY so the code behaves the same
// no matter what default the core happens to use.
const int ADC_BITS = 10;
const int ADC_MAX  = 1023;   // 2^10 - 1

// If you use a light sensor module and "Light" RISES when you cover the
// sensor with your hand, set this to true. Some modules solder the LDR and
// resistor the other way round; this flips the reading so no rewiring is needed.
const bool LDR_INVERTED = false;

// If you use a 3-pin buzzer module and the tiny transistor on it reads 8550 or
// 9012, set this to true. Those modules sound on LOW; left false, the buzzer
// draws current even while silent and the module warms up.
const bool BUZZER_ACTIVE_LOW = false;

// Range of tones the buzzer produces, in Hz
const int TONE_MIN = 200;
const int TONE_MAX = 1200;

// Smoothing: how much weight a new reading carries (0.0 - 1.0)
// Smaller = smoother, but slower to react
const float SMOOTHING = 0.2;

float smoothedLight = 0;     // The smoothed light level

unsigned long lastPrintAt = 0;

// Read the light level: 0 = dark, ADC_MAX = bright, whichever sensor you have
int readLight() {
  int value = analogRead(PIN_LDR);
  return LDR_INVERTED ? ADC_MAX - value : value;
}

// Silence the buzzer and park the pin at the module's "quiet" level
void buzzerOff() {
  noTone(PIN_BUZZER);
  digitalWrite(PIN_BUZZER, BUZZER_ACTIVE_LOW ? HIGH : LOW);
}

void setup() {
  Monitor.begin();

  analogReadResolution(ADC_BITS);

  for (int i = 0; i < LED_COUNT; i++) {
    pinMode(LED_PINS[i], OUTPUT);
  }
  pinMode(PIN_BUZZER, OUTPUT);
  buzzerOff();

  // Seed with a real reading so the bar does not climb up from zero
  smoothedLight = readLight();
}

void loop() {
  // ── Read the raw values ──
  int rawLight = readLight();           // 0 (dark) .. 1023 (bright)
  int rawPot   = analogRead(PIN_POT);   // 0 .. 1023

  // ── Smooth them ──
  // A single reading jitters, so we blend each new one slowly into the old.
  smoothedLight = smoothedLight * (1.0 - SMOOTHING) + rawLight * SMOOTHING;

  // ── Update the LED bar ──
  // Turn the light level into a count of LEDs between 0 and 5
  int litCount = map((int)smoothedLight, 0, ADC_MAX, 0, LED_COUNT);
  litCount = constrain(litCount, 0, LED_COUNT);

  for (int i = 0; i < LED_COUNT; i++) {
    digitalWrite(LED_PINS[i], i < litCount ? HIGH : LOW);
  }

  // ── Alarm ──
  // The potentiometer sets the threshold; turn it fully down and it never sounds
  int threshold = rawPot;

  if (smoothedLight < threshold) {
    // The darker it gets, the lower the pitch
    int frequency = map((int)smoothedLight, 0, threshold, TONE_MIN, TONE_MAX);
    frequency = constrain(frequency, TONE_MIN, TONE_MAX);
    tone(PIN_BUZZER, frequency);
  } else {
    buzzerOff();
  }

  // ── Print to the serial monitor twice a second ──
  if (millis() - lastPrintAt > 500) {
    lastPrintAt = millis();
    Monitor.print("Light: ");
    Monitor.print((int)smoothedLight);
    Monitor.print("   Threshold: ");
    Monitor.print(threshold);
    Monitor.print("   LEDs: ");
    Monitor.println(litCount);
  }

  delay(20);   // Give the ADC a breather; ~50 readings a second is plenty
}
