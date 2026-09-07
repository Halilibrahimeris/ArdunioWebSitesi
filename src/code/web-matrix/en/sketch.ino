/*
  Project 6 — Write to the LED Matrix from the Web
  Arduino UNO Q  ·  sketch/sketch.ino  (runs on the STM32 microcontroller)

  What it does
    Scrolls text sent from the Linux side across the 8x13 LED matrix.
    The text, brightness and speed can all be changed live from a web page.

  The idea here is the REVERSE of project 5:
    In project 5 the microcontroller called Linux (Bridge.notify).
    Here Linux calls the microcontroller (Bridge.call → Bridge.provide).

  The matrix cannot render text on its own, so we define our own 3x5 font.
*/

#include <Arduino_RouterBridge.h>
#include <Arduino_LED_Matrix.h>

Arduino_LED_Matrix matrix;

// ───────────────── The matrix ─────────────────
const uint8_t FRAME_ROWS = 8;
const uint8_t FRAME_COLS = 13;
const uint8_t FRAME_SIZE = FRAME_ROWS * FRAME_COLS;

uint8_t frame[FRAME_SIZE] = { 0 };

// ───────────────── A 3x5 font ─────────────────
// Every character is 3 columns wide and 5 rows tall.
// One column is a single byte: bit0 = top row, bit4 = bottom row.
//
// For example, the letter A:
//   . # .      column0 = rows 1,2,3,4  -> 0b11110 = 0x1E
//   # . #      column1 = rows 0,2      -> 0b00101 = 0x05
//   # # #      column2 = rows 1,2,3,4  -> 0b11110 = 0x1E
//   # . #
//   # . #
const uint8_t GLYPH_WIDTH   = 3;
const uint8_t GLYPH_SPACING = 1;   // Blank column between letters
const uint8_t CHAR_COLS     = GLYPH_WIDTH + GLYPH_SPACING;

// The supported characters, in the SAME order as the font table below
const char CHARSET[] = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .-!?:";

const uint8_t FONT[][GLYPH_WIDTH] = {
  { 0x1E, 0x05, 0x1E },  // A
  { 0x1F, 0x15, 0x0A },  // B
  { 0x0E, 0x11, 0x11 },  // C
  { 0x1F, 0x11, 0x0E },  // D
  { 0x1F, 0x15, 0x11 },  // E
  { 0x1F, 0x05, 0x01 },  // F
  { 0x0E, 0x11, 0x1D },  // G
  { 0x1F, 0x04, 0x1F },  // H
  { 0x11, 0x1F, 0x11 },  // I
  { 0x08, 0x10, 0x0F },  // J
  { 0x1F, 0x04, 0x1B },  // K
  { 0x1F, 0x10, 0x10 },  // L
  { 0x1F, 0x06, 0x1F },  // M
  { 0x1F, 0x02, 0x1F },  // N
  { 0x0E, 0x11, 0x0E },  // O
  { 0x1F, 0x05, 0x02 },  // P
  { 0x0E, 0x11, 0x1E },  // Q
  { 0x1F, 0x05, 0x1A },  // R
  { 0x12, 0x15, 0x09 },  // S
  { 0x01, 0x1F, 0x01 },  // T
  { 0x1F, 0x10, 0x1F },  // U
  { 0x0F, 0x10, 0x0F },  // V
  { 0x1F, 0x0C, 0x1F },  // W
  { 0x1B, 0x04, 0x1B },  // X
  { 0x03, 0x1C, 0x03 },  // Y
  { 0x19, 0x15, 0x13 },  // Z
  { 0x0E, 0x11, 0x0E },  // 0
  { 0x12, 0x1F, 0x10 },  // 1
  { 0x19, 0x15, 0x12 },  // 2
  { 0x11, 0x15, 0x0E },  // 3
  { 0x07, 0x04, 0x1F },  // 4
  { 0x07, 0x15, 0x19 },  // 5
  { 0x0E, 0x15, 0x09 },  // 6
  { 0x01, 0x1D, 0x03 },  // 7
  { 0x0A, 0x15, 0x0A },  // 8
  { 0x12, 0x15, 0x0E },  // 9
  { 0x00, 0x00, 0x00 },  // space
  { 0x00, 0x10, 0x00 },  // .
  { 0x04, 0x04, 0x04 },  // -
  { 0x00, 0x17, 0x00 },  // !
  { 0x01, 0x15, 0x03 },  // ?
  { 0x00, 0x0A, 0x00 },  // :
};

// Where the text starts vertically: 5 rows of text centred in 8 rows
const uint8_t TEXT_TOP = 1;

// ───────────────── State ─────────────────
const int MAX_TEXT = 64;
char    message[MAX_TEXT + 1] = "HELLO";
uint8_t brightness = 7;      // 0-7
int     scrollMs   = 90;     // Time per column of scroll (smaller = faster)

int           scrollOffset = 0;
unsigned long lastScrollAt = 0;

void setup() {
  Monitor.begin();

  matrix.begin();
  matrix.setGrayscaleBits(3);
  matrix.clear();

  Bridge.begin();

  // Announce the functions the Linux side may call.
  // These names must match the Bridge.call strings in main.py EXACTLY.
  Bridge.provide("show_text",      show_text);
  Bridge.provide("set_brightness", set_brightness);
  Bridge.provide("set_speed",      set_speed);

  Monitor.println("Matrix ready, waiting for text from the web interface");
}

void loop() {
  if (millis() - lastScrollAt < (unsigned long)scrollMs) return;
  lastScrollAt = millis();

  drawFrame();

  scrollOffset++;
  if (scrollOffset >= totalScrollWidth()) {
    scrollOffset = 0;   // Wrap around and loop forever
  }
}

// ───────────────── Functions called from Linux ─────────────────

// Replaces the text on display
void show_text(String text) {
  int len = text.length();
  if (len > MAX_TEXT) len = MAX_TEXT;

  for (int i = 0; i < len; i++) {
    message[i] = text[i];
  }
  message[len] = '\0';

  scrollOffset = 0;   // Start the new text from the beginning

  Monitor.print("New text: ");
  Monitor.println(message);
}

// Sets the brightness (0-7)
void set_brightness(int value) {
  brightness = constrain(value, 0, 7);
}

// Sets the scroll speed, in milliseconds per column
void set_speed(int value) {
  scrollMs = constrain(value, 20, 400);
}

// ───────────────── Drawing ─────────────────

// How many columns does the text occupy? We leave a screen's worth of blank
// space around it so the text scrolls in from the right and fully off the left.
int textWidth() {
  return strlen(message) * CHAR_COLS;
}

int totalScrollWidth() {
  return textWidth() + FRAME_COLS;
}

// Finds a character's position in CHARSET.
// Anything unsupported becomes a space.
int glyphIndex(char c) {
  // Fold lowercase to uppercase
  if (c >= 'a' && c <= 'z') c = c - 'a' + 'A';

  for (int i = 0; CHARSET[i] != '\0'; i++) {
    if (CHARSET[i] == c) return i;
  }
  return 36;   // Index of the space character in CHARSET
}

// Returns one column of the scrolled text.
// Columns that fall in the gap between letters come back as 0 (blank).
uint8_t columnAt(int column) {
  if (column < 0 || column >= textWidth()) return 0;

  int charIdx = column / CHAR_COLS;
  int subCol  = column % CHAR_COLS;

  if (subCol >= GLYPH_WIDTH) return 0;   // The gap between letters

  return FONT[glyphIndex(message[charIdx])][subCol];
}

void drawFrame() {
  memset(frame, 0, FRAME_SIZE);

  for (int x = 0; x < FRAME_COLS; x++) {
    // Which column of the text belongs at screen column x?
    uint8_t bits = columnAt(scrollOffset + x - FRAME_COLS);

    for (int bit = 0; bit < 5; bit++) {
      if (bits & (1 << bit)) {
        int y = TEXT_TOP + bit;
        if (y >= 0 && y < FRAME_ROWS) {
          frame[y * FRAME_COLS + x] = brightness;
        }
      }
    }
  }

  matrix.draw(frame);
}
