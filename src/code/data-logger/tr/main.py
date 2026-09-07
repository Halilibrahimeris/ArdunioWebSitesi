# Proje 5 — Veri Kaydedici
# Arduino UNO Q  ·  python/main.py  (Linux tarafında, QRB2210 üzerinde çalışır)
#
# Ne yapar?
#   Mikrodenetleyicinin gönderdiği sensör ölçümlerini alır, zaman serisi
#   veritabanına yazar ve ayrıca insan gözüyle okunabilir bir CSV dosyası tutar.
#
# Buradaki asıl fikir: mikrodenetleyici ÖLÇER, Linux KAYDEDER.
# İkisi Bridge üzerinden konuşur.

import csv
import time
from pathlib import Path

from arduino.app_utils import App, Bridge
from arduino.app_bricks.dbstorage_tsstore import TimeSeriesStore

# ───────────────── Veritabanı ─────────────────
# Brick sayesinde veritabanı kurmak, tablo açmak gibi işlerle uğraşmıyoruz.
db = TimeSeriesStore()
db.start()

# ───────────────── CSV dosyası ─────────────────
# Veritabanı programlar için pratik, ama veriyi Excel'de açmak istersen
# düz bir CSV en kolayı. İkisini birden tutuyoruz.
CSV_PATH = Path(__file__).parent / "olcumler.csv"

# Dosya yoksa başlık satırını yaz
if not CSV_PATH.exists():
    with CSV_PATH.open("w", newline="", encoding="utf-8") as f:
        csv.writer(f).writerow(["zaman", "sicaklik_C", "nem_yuzde", "isik_ham"])

# Kaç ölçüm kaydettik?
sample_count = 0


def kayit_al(sicaklik: float, nem: float, isik: int):
    """
    Sketch tarafından çağrılır.

    Bridge.provide() ile kaydedildiği için mikrodenetleyici bu fonksiyonu
    adıyla çağırabiliyor. Parametreler sketch'te gönderildiği sırayla gelir.
    """
    global sample_count

    # ── Gelen veriyi doğrula ──
    # Sensör arızalanırsa saçma değerler gelebilir. Çöp veriyi kaydetmek,
    # hiç kaydetmemekten daha kötüdür.
    if not (-40 <= sicaklik <= 80):
        print(f"Gecersiz sicaklik atlandi: {sicaklik}")
        return
    if not (0 <= nem <= 100):
        print(f"Gecersiz nem atlandi: {nem}")
        return

    # ── Veritabanına yaz ──
    db.write_sample("sicaklik", sicaklik)
    db.write_sample("nem", nem)
    db.write_sample("isik", isik)

    # ── CSV'ye ekle ──
    zaman = time.strftime("%Y-%m-%d %H:%M:%S")
    with CSV_PATH.open("a", newline="", encoding="utf-8") as f:
        csv.writer(f).writerow([zaman, f"{sicaklik:.1f}", f"{nem:.0f}", isik])

    sample_count += 1
    print(f"[{sample_count:4d}] {zaman}  {sicaklik:.1f}°C  %{nem:.0f}  isik={isik}")


def son_degerleri_yazdir():
    """Veritabanından en son kaydedilen değerleri okuyup gösterir."""
    son_sicaklik = db.read_last_sample("sicaklik")
    son_nem = db.read_last_sample("nem")
    print(f"Veritabanindaki son kayit -> sicaklik: {son_sicaklik}, nem: {son_nem}")


# ───────────────── Bridge'e kaydet ─────────────────
# Buradaki metin ("kayit_al") sketch içindeki Bridge.notify çağrısındaki
# metinle BİREBİR aynı olmalı. Yazım hatası yaparsan hata mesajı almazsın,
# sadece hiçbir şey olmaz.
Bridge.provide("kayit_al", kayit_al)

print("Veri kaydedici hazir. Mikrodenetleyiciden veri bekleniyor...")
print(f"CSV dosyasi: {CSV_PATH}")

# Uygulama durdurulana kadar burada bekler
App.run()
