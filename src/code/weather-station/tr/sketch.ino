/*
  Proje 4 — OLED Hava İstasyonu
  Arduino UNO Q  ·  sketch/sketch.ino

  Ne yapar?
    DHT11 sensöründen sıcaklık ve nem okur, 0.96" OLED ekranda gösterir.
    Ekranın altında son 60 ölçümün sıcaklık grafiği kayar.
    Gördüğü en düşük ve en yüksek sıcaklığı hatırlar.

  Neden OLED, neden LCD değil?
    Klasik I2C LCD'lerin arkasındaki PCF8574 kartı, I2C hatlarını kendi
    dirençleriyle 5V'a çeker ve bu 5V kartın SDA/SCL pinlerine biner.
    SSD1306 OLED doğal olarak 3.3V çalışır — hiçbir ek devre gerekmez.
*/

#include <Arduino_RouterBridge.h>   // Monitor / App Lab serial monitor
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <DHT.h>

// ───────────────── Ekran ─────────────────
const int SCREEN_WIDTH  = 128;
const int SCREEN_HEIGHT = 64;
const int OLED_RESET    = -1;    // Ayrı reset pini yok
const int OLED_ADDRESS  = 0x3C;  // Çoğu 0.96" modülün adresi (bazıları 0x3D)

Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

// ───────────────── Sensör ─────────────────
const int PIN_DHT  = 7;
const int DHT_TYPE = DHT11;

DHT dht(PIN_DHT, DHT_TYPE);

// ───────────────── Grafik verisi ─────────────────
// Ekranın alt kısmında 60 pikselli bir sıcaklık grafiği çiziyoruz.
const int  HISTORY_SIZE = 60;
float      history[HISTORY_SIZE];
int        historyCount = 0;   // Kaç geçerli ölçüm var
int        historyHead  = 0;   // Sıradaki yazma konumu

// ───────────────── Durum ─────────────────
float temperature = 0;
float humidity    = 0;
float minTemp     =  999;
float maxTemp     = -999;
bool  sensorOk    = false;

// DHT11 saniyede birden fazla okumaya izin vermez
const unsigned long READ_INTERVAL_MS = 2000;
unsigned long lastReadAt = 0;

void setup() {
  Monitor.begin();

  dht.begin();

  // I2C başlat. UNO Q'da header üzerindeki SDA/SCL pinleri Wire'a bağlıdır.
  // Qwiic konnektörünü kullanmak istersen Wire1 dene.
  Wire.begin();

  if (!display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDRESS)) {
    Monitor.println("OLED bulunamadi! Adresi (0x3C / 0x3D) ve kablolari kontrol et.");
    // Ekran yoksa devam etmenin anlamı yok
    while (true) {
      delay(1000);
    }
  }

  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.println("Hava Istasyonu");
  display.println("Olculuyor...");
  display.display();
}

void loop() {
  if (millis() - lastReadAt < READ_INTERVAL_MS) return;
  lastReadAt = millis();

  readSensor();
  drawScreen();
}

// ───────────────── Sensörü oku ─────────────────
void readSensor() {
  float t = dht.readTemperature();   // Santigrat
  float h = dht.readHumidity();      // Yüzde

  // DHT11 zaman zaman okuma hatası verir; NaN dönerse eski değeri koruyoruz.
  if (isnan(t) || isnan(h)) {
    sensorOk = false;
    Monitor.println("DHT11 okunamadi (bu ara sira normaldir)");
    return;
  }

  sensorOk    = true;
  temperature = t;
  humidity    = h;

  if (t < minTemp) minTemp = t;
  if (t > maxTemp) maxTemp = t;

  // Grafiğe ekle (halka tampon)
  history[historyHead] = t;
  historyHead = (historyHead + 1) % HISTORY_SIZE;
  if (historyCount < HISTORY_SIZE) historyCount++;

  Monitor.print("Sicaklik: ");
  Monitor.print(t, 1);
  Monitor.print(" C   Nem: ");
  Monitor.print(h, 0);
  Monitor.println(" %");
}

// ───────────────── Ekranı çiz ─────────────────
void drawScreen() {
  display.clearDisplay();

  // ── Üst satır: sıcaklık, büyük punto ──
  display.setTextSize(2);
  display.setCursor(0, 0);
  display.print(temperature, 1);
  display.print((char)247);   // Derece işareti
  display.print("C");

  // ── Sağ üst: nem ──
  display.setTextSize(1);
  display.setCursor(88, 0);
  display.print(humidity, 0);
  display.print("%");
  display.setCursor(88, 10);
  display.print("nem");

  // ── İkinci satır: min / max ──
  display.setTextSize(1);
  display.setCursor(0, 20);
  if (minTemp < 900) {
    display.print("min ");
    display.print(minTemp, 1);
    display.print("  max ");
    display.print(maxTemp, 1);
  }

  // ── Sensör hatası uyarısı ──
  if (!sensorOk) {
    display.setCursor(0, 30);
    display.print("! sensor okunamadi");
  }

  drawGraph();
  display.display();
}

// ───────────────── Sıcaklık grafiği ─────────────────
// Ekranın alt 30 pikselini kullanır. Y ekseni, görülen min-max aralığına
// göre kendini otomatik ayarlar.
void drawGraph() {
  const int GRAPH_TOP    = 34;
  const int GRAPH_BOTTOM = 63;
  const int GRAPH_LEFT   = 0;

  display.drawFastHLine(GRAPH_LEFT, GRAPH_BOTTOM, HISTORY_SIZE, SSD1306_WHITE);

  if (historyCount < 2) return;

  // Grafikteki en düşük ve en yüksek değeri bul
  float lo =  999;
  float hi = -999;
  for (int i = 0; i < historyCount; i++) {
    float v = history[i];
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }

  // Aralık çok darsa grafik zıplar; en az 2 derecelik pencere kullan
  if (hi - lo < 2.0) {
    float mid = (hi + lo) / 2.0;
    lo = mid - 1.0;
    hi = mid + 1.0;
  }

  // En eski ölçümden başlayarak çiz
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

  // Sağ tarafta grafiğin ölçeğini yaz
  display.setTextSize(1);
  display.setCursor(66, GRAPH_TOP);
  display.print(hi, 1);
  display.setCursor(66, GRAPH_BOTTOM - 7);
  display.print(lo, 1);
}
