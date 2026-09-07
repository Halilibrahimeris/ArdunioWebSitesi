# Proje 7 — Akıllı Priz
# Arduino UNO Q  ·  python/main.py
#
# Web arayüzü ile mikrodenetleyici arasında köprü kurar.
# İki yön de kullanılıyor:
#   tarayıcı → Python → Bridge.call  → sketch   (komut)
#   sketch   → Bridge.notify → Python → tarayıcı (zamanlayıcı doldu bildirimi)

from arduino.app_utils import App, Bridge
from arduino.app_bricks.web_ui import WebUI

ui = WebUI()

# Bağlanan her tarayıcıyı güncel duruma getirebilmek için durumu saklıyoruz
state = {
    "relay": False,
    "color": {"r": 0, "g": 120, "b": 255},
    "brightness": 60,
    "timer": 0,          # dakika, 0 = zamanlayıcı yok
}


def yayinla():
    """Bağlı tüm tarayıcılara güncel durumu gönder."""
    ui.send_message("durum", state)


def sayiya_cevir(value, alt, ust, varsayilan):
    """
    Tarayıcıdan gelen değeri güvenli bir tam sayıya çevirir.

    Tarayıcı metin, None ya da aralık dışı bir sayı gönderebilir.
    Sınırda doğrulama yapmazsak bu değer doğrudan donanıma gider.
    """
    try:
        number = int(value)
    except (TypeError, ValueError):
        return varsayilan
    return max(alt, min(ust, number))


# ───────────────── Tarayıcıdan gelen komutlar ─────────────────

def role_ayarla(sid, data):
    açık = bool(data.get("on", False))
    state["relay"] = açık

    if not açık:
        state["timer"] = 0        # Elle kapatınca zamanlayıcı da iptal olur

    Bridge.call("set_relay", 1 if açık else 0)
    yayinla()
    print(f"Role: {'ACIK' if açık else 'KAPALI'}")


def renk_ayarla(sid, data):
    r = sayiya_cevir(data.get("r"), 0, 255, 0)
    g = sayiya_cevir(data.get("g"), 0, 255, 120)
    b = sayiya_cevir(data.get("b"), 0, 255, 255)

    state["color"] = {"r": r, "g": g, "b": b}

    Bridge.call("set_color", r, g, b)
    yayinla()


def parlaklik_ayarla(sid, data):
    value = sayiya_cevir(data.get("brightness"), 0, 255, 60)
    state["brightness"] = value

    Bridge.call("set_brightness", value)
    yayinla()


def zamanlayici_ayarla(sid, data):
    minutes = sayiya_cevir(data.get("minutes"), 0, 720, 0)   # en fazla 12 saat
    state["timer"] = minutes

    # Zamanlayıcı kurulunca röle de açılsın — kullanıcının beklediği davranış bu
    if minutes > 0 and not state["relay"]:
        state["relay"] = True
        Bridge.call("set_relay", 1)

    Bridge.call("set_timer", minutes)
    yayinla()
    print(f"Zamanlayici: {minutes} dakika")


# ───────────────── Mikrodenetleyiciden gelen bildirim ─────────────────

def role_degisti(state_value: int):
    """
    Sketch, zamanlayıcı dolup röleyi kendiliğinden kapattığında burayı çağırır.
    Bu olmadan web arayüzü rölenin hâlâ açık olduğunu sanırdı.
    """
    state["relay"] = bool(state_value)
    state["timer"] = 0
    yayinla()
    print("Zamanlayici doldu, role kapandi")


def baglandi(sid):
    yayinla()
    print(f"Tarayici baglandi: {sid}")


# ───────────────── Olayları bağla ─────────────────
ui.on_message("role_ayarla", role_ayarla)
ui.on_message("renk_ayarla", renk_ayarla)
ui.on_message("parlaklik_ayarla", parlaklik_ayarla)
ui.on_message("zamanlayici_ayarla", zamanlayici_ayarla)
ui.on_connect(baglandi)

# Sketch'ten gelen bildirimi karşıla
Bridge.provide("relay_changed", role_degisti)

print("Akilli priz arayuzu hazir.")

App.run()
