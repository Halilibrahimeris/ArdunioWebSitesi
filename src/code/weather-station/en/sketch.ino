/*
  Project 4 — OLED Weather Station
  Arduino UNO Q  ·  sketch/sketch.ino

  What it does
    Reads temperature and humidity from a DHT11 and shows them on a 0.96" OLED.
    A scrolling graph of the last 60 readings runs along the bottom.
    It remembers the lowest and highest temperature it has seen.

  Why an OLED and not an LCD?
    The PCF8574 backpack behind a classic I2C LCD pulls the I2C lines up to 5V
    with its own resistors, putting 5V onto the board's SDA/SCL pins.
    An SSD1306 OLED runs natively at 3.3V — no extra circuitry at all.
*/

#include <Arduino_RouterBridge.h>   // Monitor / App Lab serial monitor
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <DHT.h>

// ───────────────── Display ─────────────────
const int SCREEN_WIDTH  = 128;
const int SCREEN_HEIGHT = 64;
const int OLED_RESET    = -1;    // No separate reset pin
const int OLED_ADDRESS  = 0x3C;  // Most 0.96" modules use this (some use 0x3D)

Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

// ───────────────── Sensor ─────────────────
const int PIN_DHT  = 7;
const int DHT_TYPE = DHT11;

DHT dht(PIN_DHT, DHT_TYPE);

// ───────────────── Graph data ─────────────────
// A 60-pixel-wide temperature graph along the bottom of the screen.
const int  HISTORY_SIZE = 60;
float      history[HISTORY_SIZE];
int        historyCount = 0;   // How many valid readings we have
int        historyHead  = 0;   // Where the next one goes

// ───────────────── State ─────────────────
float temperature = 0;
float humidity    = 0;
float minTemp     =  999;
float maxTemp     = -999;
bool  sensorOk    = false;

// A DHT11 will not tolerate more than one reading per second
const unsigned long READ_INTERVAL_MS = 2000;
unsigned long lastReadAt = 0;

void setup() {
  Monitor.begin();

  dht.begin();

  // Start I2C. On the UNO Q the header's SDA/SCL pins belong to Wire.
  // If you would rather use the Qwiic connector, try Wire1.
  Wire.begin();

  if (!display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDRESS)) {
    Monitor.println("OLED not found! Check the address (0x3C / 0x3D) and the wiring.");
    // Without a display there is no point continuing
    while (true) {
      delay(1000);
    }
  }

  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.println("Weather Station");
  display.println("Measuring...");
  display.display();
}

void loop() {
  if (millis() - lastReadAt < READ_INTERVAL_MS) return;
  lastReadAt = millis();

  readSensor();
  drawScreen();
}

// ───────────────── Read the sensor ─────────────────
void readSensor() {
  float t = dht.readTemperature();   // Celsius
  float h = dht.readHumidity();      // Percent

  // A DHT11 fails a reading now and then; on NaN we keep the previous value.
  if (isnan(t) || isnan(h)) {
    sensorOk = false;
    Monitor.println("DHT11 read failed (an occasional one is normal)");
    return;
  }

  sensorOk    = true;
  temperature = t;
  humidity    = h;

  if (t < minTemp) minTemp = t;
  if (t > maxTemp) maxTemp = t;

  // Append to the graph (ring buffer)
  history[historyHead] = t;
  historyHead = (historyHead + 1) % HISTORY_SIZE;
  if (historyCount < HISTORY_SIZE) historyCount++;

  Monitor.print("Temperature: ");
  Monitor.print(t, 1);
  Monitor.print(" C   Humidity: ");
  Monitor.print(h, 0);
  Monitor.println(" %");
}

// ───────────────── Draw the screen ─────────────────
void drawScreen() {
  display.clearDisplay();

  // ── Top line: temperature, in large type ──
  display.setTextSize(2);
  display.setCursor(0, 0);
  display.print(temperature, 1);
  display.print((char)247);   // Degree symbol
  display.print("C");

  // ── Top right: humidity ──
  display.setTextSize(1);
  display.setCursor(88, 0);
  display.print(humidity, 0);
  display.print("%");
  display.setCursor(88, 10);
  display.print("hum");

  // ── Second line: min / max ──
  display.setTextSize(1);
  display.setCursor(0, 20);
  if (minTemp < 900) {
    display.print("min ");
    display.print(minTemp, 1);
    display.print("  max ");
    display.print(maxTemp, 1);
  }

  // ── Sensor failure warning ──
  if (!sensorOk) {
    display.setCursor(0, 30);
    display.print("! sensor read failed");
  }

  drawGraph();
  display.display();
}

// ───────────────── Temperature graph ─────────────────
// Uses the bottom 30 pixels. The Y axis rescales itself to the min-max
// range actually seen.
void drawGraph() {
  const int GRAPH_TOP    = 34;
  const int GRAPH_BOTTOM = 63;
  const int GRAPH_LEFT   = 0;

  display.drawFastHLine(GRAPH_LEFT, GRAPH_BOTTOM, HISTORY_SIZE, SSD1306_WHITE);

  if (historyCount < 2) return;

  // Find the lowest and highest value on the graph
  float lo =  999;
  float hi = -999;
  for (int i = 0; i < historyCount; i++) {
    float v = history[i];
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }

  // Too narrow a range makes the graph jump; use a 2-degree window at minimum
  if (hi - lo < 2.0) {
    float mid = (hi + lo) / 2.0;
    lo = mid - 1.0;
    hi = mid + 1.0;
  }

  // Draw starting from the oldest reading
  int previousY = -1;
  for (int i = 0; i < historyCount; i++) {
    int index = (historyHead - historyCount + i + HISTORY_SIZE) % HISTORY_SIZE;
    float v = history[index];

    int y = GRAPH_BOTTOM - (int)((v - lo) / (hi - lo) * (GRAPH_BOTTOM - GRAPH_TOP));
    int x = GRAPH_LEFT + i;

    if (previousY >= 0) {
      display.drawLine(x - 1, previousY, x, y, SSD1306_WHITE);
    }
    previousY = y;
  }

  // Label the graph's scale on the right
  display.setTextSize(1);
  display.setCursor(66, GRAPH_TOP);
  display.print(hi, 1);
  display.setCursor(66, GRAPH_BOTTOM - 7);
  display.print(lo, 1);
}
