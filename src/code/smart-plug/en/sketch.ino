/*
  Project 7 — Smart Plug
  Arduino UNO Q  ·  sketch/sketch.ino

  What it does
    Switches a relay on and off from a web interface and sets the colour and
    brightness of a WS2812 RGB strip. The relay can be put on a timer.

  ┌────────────────────────────────────────────────────────────────────┐
  │  SAFETY: do NOT wire MAINS VOLTAGE (230V) to the relay here.       │
  │  Test the relay only with a battery-powered lamp, a small fan or   │
  │  another low-voltage load. Mains voltage kills.                    │
  └────────────────────────────────────────────────────────────────────┘

  A note on 3.3V:
    Relay modules run on 5V and their inputs are usually active-LOW. The
    board's 3.3V may not reliably switch such a module off. So we put a
    2N2222 transistor in between: the board drives the transistor, and the
    transistor pulls the relay input down to ground.
*/

#include <Arduino_RouterBridge.h>
#include <Adafruit_NeoPixel.h>

// ───────────────── Pin assignments ─────────────────
const int PIN_RELAY = 5;    // Through a 10k resistor to the 2N2222's base
const int PIN_STRIP = 6;    // WS2812 data input

const int STRIP_LEDS = 8;

Adafruit_NeoPixel strip(STRIP_LEDS, PIN_STRIP, NEO_GRB + NEO_KHZ800);

// ───────────────── State ─────────────────
bool    relayOn    = false;
uint8_t red        = 0;
uint8_t green      = 120;
uint8_t blue       = 255;
uint8_t brightness = 60;    // 0-255

// Timer: 0 means off. Otherwise the moment (millis) the relay switches off.
unsigned long relayOffAt = 0;

void setup() {
  Monitor.begin();

  pinMode(PIN_RELAY, OUTPUT);
  digitalWrite(PIN_RELAY, LOW);   // Start with the relay off

  strip.begin();
  strip.setBrightness(brightness);
  strip.clear();
  strip.show();

  Bridge.begin();

  Bridge.provide("set_relay",      set_relay);
  Bridge.provide("set_color",      set_color);
  Bridge.provide("set_brightness", set_brightness);
  Bridge.provide("set_timer",      set_timer);

  Monitor.println("Smart plug ready");
}

void loop() {
  checkTimer();
}

// ───────────────── Functions called from Linux ─────────────────

// Switch the relay. 1 = on, 0 = off.
void set_relay(int state) {
  relayOn = (state != 0);
  digitalWrite(PIN_RELAY, relayOn ? HIGH : LOW);

  // Switching off by hand also cancels any pending timer
  if (!relayOn) {
    relayOffAt = 0;
  }

  Monitor.print("Relay: ");
  Monitor.println(relayOn ? "ON" : "OFF");
}

// Set the strip's colour (0-255 each)
void set_color(int r, int g, int b) {
  red   = constrain(r, 0, 255);
  green = constrain(g, 0, 255);
  blue  = constrain(b, 0, 255);
  applyStrip();
}

// Set the strip's brightness (0-255)
void set_brightness(int value) {
  brightness = constrain(value, 0, 255);
  strip.setBrightness(brightness);
  applyStrip();
}

// Switch the relay off after this many minutes. 0 cancels the timer.
void set_timer(int minutes) {
  if (minutes <= 0) {
    relayOffAt = 0;
    Monitor.println("Timer cancelled");
    return;
  }

  relayOffAt = millis() + (unsigned long)minutes * 60000UL;

  Monitor.print("Relay switches off in ");
  Monitor.print(minutes);
  Monitor.println(" minutes");
}

// ───────────────── Helpers ─────────────────

void applyStrip() {
  for (int i = 0; i < STRIP_LEDS; i++) {
    strip.setPixelColor(i, strip.Color(red, green, blue));
  }
  strip.show();
}

// Has the timer expired? Checked without ever calling delay().
void checkTimer() {
  if (relayOffAt == 0) return;              // No timer running
  if (millis() < relayOffAt) return;        // Not yet

  relayOffAt = 0;
  relayOn = false;
  digitalWrite(PIN_RELAY, LOW);

  Monitor.println("Timer expired, relay switched off");

  // Tell the Linux side so the web interface updates too
  Bridge.notify("relay_changed", 0);
}
