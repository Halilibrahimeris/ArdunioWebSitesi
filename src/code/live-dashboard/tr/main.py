# Proje 8 — Canlı Sensör Paneli
# Arduino UNO Q  ·  python/main.py
#
# Bu dosya üç iş yapıyor:
#   1. Mikrodenetleyiciden gelen ölçümleri karşılar (Bridge)
#   2. Zaman serisi veritabanına kaydeder (dbstorage_tsstore)
#   3. Bağlı tüm tarayıcılara canlı olarak yayınlar (web_ui)

import time
from collections import deque

from arduino.app_utils import App, Bridge
from arduino.app_bricks.web_ui import WebUI
from arduino.app_bricks.dbstorage_tsstore import TimeSeriesStore

# ───────────────── Ayarlar ─────────────────
# Tarayıcıda gösterilecek son ölçüm sayısı.
# 2 saniyede bir ölçüm × 150 = son 5 dakika.
HISTORY_SIZE = 150

ui = WebUI()

db = TimeSeriesStore()
db.start()

# ───────────────── Bellekteki geçmiş ─────────────────
# deque(maxlen=...) sabit uzunlukta bir liste: yenisi eklenince en eski
# kendiliğinden düşer. Bu, 4. projedeki halka tamponun Python karşılığı.
history = deque(maxlen=HISTORY_SIZE)

sayac = 0


def olcum_geldi(sicaklik: float, nem: float, isik: int):
    """
    Sketch her ölçümde bunu çağırır.
    Bridge.provide ile kaydedildiği için mikrodenetleyici adıyla çağırabiliyor.
    """
    global sayac

    # ── Sınırda doğrulama ──
    # Bozuk veriyi ne veritabanına yazarız ne de grafiğe koyarız.
    if not (-40 <= sicaklik <= 80) or not (0 <= nem <= 100):
        print(f"Gecersiz olcum atlandi: {sicaklik} C, %{nem}")
        return

    isik = max(0, min(100, int(isik)))

    kayit = {
        "t": round(sicaklik, 1),
        "h": round(nem),
        "l": isik,
        "zaman": time.strftime("%H:%M:%S"),
    }

    # ── 1. Kalıcı olarak kaydet ──
    db.write_sample("sicaklik", sicaklik)
    db.write_sample("nem", nem)
    db.write_sample("isik", isik)

    # ── 2. Bellekteki geçmişe ekle ──
    history.append(kayit)

    # ── 3. Bağlı tarayıcılara yayınla ──
    # Tek bir ölçüm gönderiyoruz; tarayıcı bunu kendi grafiğine ekliyor.
    # Her seferinde tüm geçmişi göndermek gereksiz trafik olurdu.
    ui.send_message("olcum", kayit)

    sayac += 1
    if sayac % 10 == 0:
        print(f"{sayac} olcum islendi. Son: {kayit['t']} C, %{kayit['h']}")


def baglandi(sid):
    """
    Yeni bağlanan tarayıcıya geçmişin tamamını gönder.

    Bu olmadan kullanıcı sayfayı açtığında boş bir grafik görür ve
    ilk noktanın gelmesi için 2 saniye beklerdi.
    """
    ui.send_message("gecmis", {"kayitlar": list(history)})
    print(f"Tarayici baglandi: {sid} ({len(history)} kayit gonderildi)")


def gecmis_istendi(sid, data):
    """Tarayıcı geçmişi yeniden istedi (ör. sayfa yenilendi)."""
    ui.send_message("gecmis", {"kayitlar": list(history)})


# ───────────────── Bağlantıları kur ─────────────────
Bridge.provide("olcum", olcum_geldi)

ui.on_connect(baglandi)
ui.on_message("gecmis_iste", gecmis_istendi)

print("Canli panel hazir. Ayni WiFi agindaki bir tarayicidan acabilirsin.")

App.run()
