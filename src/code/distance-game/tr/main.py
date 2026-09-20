# Proje 6 — Mesafeyle Oynanan Web Oyunu
# Arduino UNO Q  ·  python/main.py  (Linux tarafında çalışır)
#
# Ne yapar?
#   web_ui brick'i ile bir web sunucusu açar. Mikrodenetleyiciden gelen her
#   ölçümü tarayıcıya iletir; tarayıcıdan gelen komutları doğrulayıp
#   mikrodenetleyiciye geçirir.
#
# Zincir iki yönlü işliyor:
#   sensör → mikrodenetleyici → Bridge.notify → Python → WebSocket → tarayıcı
#   tarayıcı → WebSocket → Python → Bridge.call → mikrodenetleyici → LED/buzzer

import json
import time
from pathlib import Path

from arduino.app_utils import App, Bridge
from arduino.app_bricks.web_ui import WebUI

# ───────────────── Ayarlar ─────────────────
# Sketch'teki PLAY_MIN / PLAY_MAX ile aynı olmalı.
MESAFE_MIN = 5.0
MESAFE_MAX = 60.0

PENCERE_MIN = 1
PENCERE_MAX = 9

# ───────────────── Skor dosyası ─────────────────
# Skorlar `state` içinde kalsaydı uygulama her yeniden başladığında silinirdi.
# Düz bir JSON dosyası bu iş için yeterli: okunabilir, taşınabilir, silmek için
# dosyayı silmek yeterli.
#
# Neden dbstorage_tsstore brick'i değil? O brick zaman serisi için — saniyede
# bir gelen SAYILAR için. Bir skor kaydı ise oyuncu adı gibi metin de taşıyor
# ve saniyede değil oyunda bir kez yazılıyor. Verinin şekli neyse depoyu ona
# göre seç.
SKOR_DOSYASI = Path(__file__).parent / "skorlar.json"
SKOR_SINIRI = 50   # Dosyada en fazla bu kadar kayıt tutulur
AD_UZUNLUGU = 16

# ───────────────── Durum ─────────────────
# Sonradan bağlanan tarayıcıya da mevcut ayarları gönderebilmek için saklıyoruz.
state = {
    "pencere": 5,
    "hedefYakin": 20.0,
    "hedefUzak": 30.0,
    "enIyiSkor": 0,
}

# Puana göre büyükten küçüğe sıralı skor listesi
skorlar = []

ui = WebUI()


def yayinla():
    """Bağlı tüm tarayıcılara güncel durumu gönderir."""
    ui.send_message("durum", state)


def skorlari_yayinla():
    """Skor tablosunu bağlı tüm tarayıcılara gönderir."""
    ui.send_message("skorlar", {"kayitlar": skorlar})


# ───────────────── Skor dosyası ─────────────────


def skorlari_yukle():
    """Dosyadaki skorları belleğe alır. Dosya yoksa ya da bozuksa boş başlarız."""
    global skorlar

    if not SKOR_DOSYASI.exists():
        skorlar = []
        return

    try:
        with SKOR_DOSYASI.open(encoding="utf-8") as f:
            veri = json.load(f)
        # Dosyayı biri elle düzenlemiş olabilir; beklediğimiz şekilde değilse yok say.
        skorlar = veri if isinstance(veri, list) else []
    except (json.JSONDecodeError, OSError) as hata:
        print(f"skorlar.json okunamadi, bos listeyle basliyoruz: {hata}")
        skorlar = []


def skorlari_kaydet():
    """
    Listeyi dosyaya yazar.

    Önce geçici bir dosyaya yazıp sonra asıl dosyanın yerine koyuyoruz. Yazma
    sırasında uygulama kapanırsa elimizde yarım bir JSON kalmasın diye.
    """
    gecici = SKOR_DOSYASI.with_name(SKOR_DOSYASI.name + ".tmp")
    try:
        with gecici.open("w", encoding="utf-8") as f:
            json.dump(skorlar, f, ensure_ascii=False, indent=2)
        gecici.replace(SKOR_DOSYASI)
    except OSError as hata:
        print(f"skorlar.json yazilamadi: {hata}")


def ad_temizle(raw) -> str:
    """
    Oyuncu adını gösterilebilir hale getirir.

    Bu da bir GÜVENLİK sınırı: tarayıcıdan gelen metne olduğu gibi güvenme.
    Görünmeyen karakterleri atıyor, uzunluğu sınırlıyor, boşsa isim veriyoruz.
    """
    if not isinstance(raw, str):
        return "Misafir"

    temiz = "".join(ch for ch in raw if ch.isprintable()).strip()
    temiz = " ".join(temiz.split())          # Art arda boşlukları tek boşluğa indir
    temiz = temiz[:AD_UZUNLUGU]

    return temiz or "Misafir"


def sayiya_cevir(value, alt, ust, varsayilan):
    """
    Tarayıcıdan gelen sayıyı güvenli hale getirir.

    Bu bir GÜVENLİK sınırı: tarayıcıdan gelen veriye asla olduğu gibi güvenme.
    Sayı değilse varsayılana düşer, sayıysa aralığa sıkıştırılır.
    """
    try:
        number = float(value)
    except (TypeError, ValueError):
        return varsayilan
    return max(alt, min(ust, number))


# ───────────────── Mikrodenetleyiciden gelenler ─────────────────


def olcum_geldi(ham: float, ortalama: float):
    """
    Sketch her ölçümde bunu çağırıyor (saniyede ~16 kez).

    Burada hiçbir hesap yapmıyoruz — ortalama zaten karttaki halka tamponda,
    yani verinin doğduğu yerde alındı. Python sadece taşıyor.
    """
    ui.send_message("olcum", {"ham": round(ham, 1), "ortalama": round(ortalama, 1)})


# ───────────────── Tarayıcıdan gelenler ─────────────────


def hedef_ayarla(sid, data):
    """Yeni tur başladı: hedef bandın alt ve üst ucu."""
    yakin = sayiya_cevir(data.get("yakin"), MESAFE_MIN, MESAFE_MAX, state["hedefYakin"])
    uzak = sayiya_cevir(data.get("uzak"), MESAFE_MIN, MESAFE_MAX, state["hedefUzak"])

    # Tarayıcı ters sırada gönderirse düzelt
    if uzak < yakin:
        yakin, uzak = uzak, yakin

    state["hedefYakin"] = yakin
    state["hedefUzak"] = uzak

    # Karta milimetre olarak gönderiyoruz: 20.0 cm → 200.
    # Tam sayı, köprüde ondalık biçim sorununu tamamen ortadan kaldırır.
    Bridge.call("set_target", int(yakin * 10), int(uzak * 10))
    yayinla()


def hedefi_temizle(sid, data):
    """Oyun bitti: LED'ler sönsün, matriste parantez kalmasın."""
    Bridge.call("clear_target")


def pencere_ayarla(sid, data):
    """Ortalama penceresi. 1 = ortalama yok, ham ölçümün kendisi."""
    pencere = int(sayiya_cevir(data.get("pencere"), PENCERE_MIN, PENCERE_MAX, state["pencere"]))
    state["pencere"] = pencere
    Bridge.call("set_window", pencere)
    yayinla()


def kutla(sid, data):
    """Hedef tutuldu: karttaki buzzer kısa bir ezgi çalsın."""
    Bridge.call("beep_success")


def skor_bildir(sid, data):
    """Oyun bitti: skoru tabloya ekle, dosyaya yaz, herkese duyur."""
    puan = int(sayiya_cevir(data.get("puan"), 0, 100000, 0))

    # Hiç puan almadan biten oyunları tabloya yazmıyoruz
    if puan <= 0:
        return

    kayit = {
        "ad": ad_temizle(data.get("ad")),
        "puan": puan,
        "tur": int(sayiya_cevir(data.get("tur"), 1, 999, 1)),
        # Hangi pencereyle oynandığı skorun yanında dursun: tablo böylece
        # "ortalama gerçekten işe yarıyor mu?" sorusunu veriyle cevaplıyor.
        "pencere": state["pencere"],
        "zaman": time.strftime("%Y-%m-%d %H:%M"),
    }

    skorlar.append(kayit)
    skorlar.sort(key=lambda k: k["puan"], reverse=True)
    del skorlar[SKOR_SINIRI:]     # Liste sonsuza kadar büyümesin

    skorlari_kaydet()

    state["enIyiSkor"] = skorlar[0]["puan"]
    print(f"Skor kaydedildi: {kayit['ad']} {puan} puan (pencere {kayit['pencere']})")

    yayinla()
    skorlari_yayinla()


def baglandi(sid):
    yayinla()
    skorlari_yayinla()

    # Ayarın tek sahibi Python. Karta da yeniden gönderiyoruz ki kart ile
    # tarayıcı asla farklı pencereye bakmasın — yoksa "yeşil yanıyor ama
    # puan gelmiyor" diye anlaşılmaz bir hata çıkar.
    Bridge.call("set_window", state["pencere"])

    print(f"Tarayici baglandi: {sid}")


# ───────────────── Olayları bağla ─────────────────
ui.on_message("hedef_ayarla", hedef_ayarla)
ui.on_message("hedefi_temizle", hedefi_temizle)
ui.on_message("pencere_ayarla", pencere_ayarla)
ui.on_message("kutla", kutla)
ui.on_message("skor_bildir", skor_bildir)
ui.on_connect(baglandi)

# Sketch'ten gelen ölçümü karşıla.
# Bu isim sketch'teki Bridge.notify("olcum", ...) ile BİREBİR aynı olmalı.
Bridge.provide("olcum", olcum_geldi)

# ───────────────── Kayıtlı skorları getir ─────────────────
skorlari_yukle()
if skorlar:
    state["enIyiSkor"] = skorlar[0]["puan"]

print(f"Skor dosyasi: {SKOR_DOSYASI}  ({len(skorlar)} kayit)")
print("Mesafe oyunu arayuzu hazir.")

App.run()
