# Proje 6 — Web'den LED Matrise Yazı Yazma
# Arduino UNO Q  ·  python/main.py  (Linux tarafında çalışır)
#
# Ne yapar?
#   web_ui brick'i ile bir web sunucusu açar. Tarayıcıdan gelen metni
#   temizler ve Bridge üzerinden mikrodenetleyiciye gönderir.
#
# Zincir şöyle işliyor:
#   tarayıcı → WebSocket → Python → Bridge → mikrodenetleyici → LED matris

from arduino.app_utils import App, Bridge
from arduino.app_bricks.web_ui import WebUI

# ───────────────── Ayarlar ─────────────────
MAX_LENGTH = 60          # Matriste kaydırmak için makul bir üst sınır
DEFAULT_TEXT = "MERHABA"

# Sketch'teki 3x5 font yalnızca bu karakterleri tanıyor
ALLOWED = set("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .-!?:")

# Türkçe karakterlerin ASCII karşılıkları.
# Font'a Türkçe harf eklemek yerine burada dönüştürmek çok daha ucuz.
TURKISH_MAP = str.maketrans({
    "Ç": "C", "ç": "C",
    "Ğ": "G", "ğ": "G",
    "İ": "I", "ı": "I",
    "Ö": "O", "ö": "O",
    "Ş": "S", "ş": "S",
    "Ü": "U", "ü": "U",
})

# ───────────────── Durum ─────────────────
# Sonradan bağlanan tarayıcılara da mevcut ayarları gönderebilmek için saklıyoruz.
state = {
    "text": DEFAULT_TEXT,
    "brightness": 7,
    "speed": 90,
}

ui = WebUI()


def temizle(raw: str) -> str:
    """
    Tarayıcıdan gelen metni matrisin gösterebileceği hale getirir.

    Bu bir GÜVENLİK sınırı: tarayıcıdan gelen veriye asla olduğu gibi güvenme.
    Kullanıcı 10.000 karakterlik bir metin ya da hiç tanımadığımız semboller
    gönderebilir.
    """
    text = str(raw).translate(TURKISH_MAP).upper()

    # Tanınmayan her karakteri boşluğa çevir
    text = "".join(ch if ch in ALLOWED else " " for ch in text)

    # Arka arkaya boşlukları teke indir, baştaki ve sondakini at
    text = " ".join(text.split())

    return text[:MAX_LENGTH]


# ───────────────── Tarayıcıdan gelen mesajlar ─────────────────

def yazi_ayarla(sid, data):
    """Tarayıcı yeni bir metin gönderdi."""
    text = temizle(data.get("text", ""))

    if not text:
        ui.send_message("hata", {"mesaj": "Metin bos olamaz"})
        return

    state["text"] = text

    # Mikrodenetleyicideki show_text fonksiyonunu çağır.
    # Bu isim sketch'teki Bridge.provide("show_text", ...) ile aynı olmalı.
    Bridge.call("show_text", text)

    # Bağlı tüm tarayıcılara yeni durumu bildir
    ui.send_message("durum", state)
    print(f"Matriste gosterilen metin: {text}")


def parlaklik_ayarla(sid, data):
    """Parlaklık kaydırıcısı değişti (0-7)."""
    try:
        value = int(data.get("brightness", 7))
    except (TypeError, ValueError):
        return

    value = max(0, min(7, value))
    state["brightness"] = value

    Bridge.call("set_brightness", value)
    ui.send_message("durum", state)


def hiz_ayarla(sid, data):
    """Hız kaydırıcısı değişti (milisaniye / sütun)."""
    try:
        value = int(data.get("speed", 90))
    except (TypeError, ValueError):
        return

    value = max(20, min(400, value))
    state["speed"] = value

    Bridge.call("set_speed", value)
    ui.send_message("durum", state)


def baglandi(sid):
    """Yeni bir tarayıcı bağlandığında mevcut durumu ona gönder."""
    ui.send_message("durum", state)
    print(f"Tarayici baglandi: {sid}")


# ───────────────── Olayları bağla ─────────────────
ui.on_message("yazi_ayarla", yazi_ayarla)
ui.on_message("parlaklik_ayarla", parlaklik_ayarla)
ui.on_message("hiz_ayarla", hiz_ayarla)
ui.on_connect(baglandi)

print("Web arayuzu hazir. Ayni WiFi agindaki bir tarayicidan acabilirsin.")

App.run()
