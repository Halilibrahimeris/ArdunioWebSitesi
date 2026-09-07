# Proje 9 — Telegram Bot
# Arduino UNO Q  ·  python/main.py
#
# Ne yapar?
#   Telegram üzerinden sorgulanabilen bir bot çalıştırır.
#   Mikrodenetleyiciden gelen hareket bildirimlerini biriktirir ve
#   sen sorduğunda özetler. Ayrıca hava durumu bilgisi verir.
#
# GÜVENLİK NOTU
#   Bot token'ı bu dosyada YOK ve olmamalı.
#   telegram_bot brick'i onu TELEGRAM_BOT_TOKEN ortam değişkeninden okur.
#   Token'ı koda gömersen, kodu paylaştığın herkes botunu ele geçirir.

import os
import time
from collections import deque

from arduino.app_utils import App, Bridge
from arduino.app_bricks.telegram_bot import TelegramBot, Sender, Message
from arduino.app_bricks.weather_forecast import WeatherForecast

# ───────────────── Ayarlar ─────────────────

# Botunla konuşmasına izin verilen Telegram kullanıcı kimlikleri.
# Kendi kimliğini öğrenmek için Telegram'da @userinfobot ile konuş.
#
# Bu listeyi BOŞ BIRAKMA. Boş bırakırsan botunun adını bulan herkes
# odandaki hareketi sorgulayabilir.
IZINLI_KULLANICILAR = [
    123456789,   # ← kendi Telegram kullanıcı kimliğini yaz
]

# Hava durumu için varsayılan şehir
VARSAYILAN_SEHIR = os.environ.get("WEATHER_CITY", "Istanbul")

# Bellekte tutulacak hareket kaydı sayısı
GECMIS_BOYUTU = 100

# ───────────────── Durum ─────────────────
hareket_gecmisi = deque(maxlen=GECMIS_BOYUTU)
baslangic_zamani = time.time()

# ───────────────── Brickler ─────────────────
bot = TelegramBot(whitelist_user_ids=IZINLI_KULLANICILAR)
hava = WeatherForecast()


# ───────────────── Mikrodenetleyiciden gelen ─────────────────

def hareket_algilandi(deger: int):
    """Sketch, PIR sensörü tetiklendiğinde bunu çağırır."""
    hareket_gecmisi.append(time.time())
    print(f"Hareket kaydedildi. Toplam: {len(hareket_gecmisi)}")


# ───────────────── Yardımcılar ─────────────────

def sure_metni(saniye: float) -> str:
    """142 saniyeyi '2 dakika' gibi okunur bir metne çevirir."""
    saniye = int(saniye)

    if saniye < 60:
        return f"{saniye} saniye"
    if saniye < 3600:
        return f"{saniye // 60} dakika"
    if saniye < 86400:
        return f"{saniye // 3600} saat"
    return f"{saniye // 86400} gün"


def son_bir_saatteki_hareket() -> int:
    simdi = time.time()
    return sum(1 for t in hareket_gecmisi if simdi - t < 3600)


# ───────────────── Telegram komutları ─────────────────

def komut_start(sender: Sender, message: Message):
    sender.reply(
        f"Merhaba {sender.first_name}!\n\n"
        "Ben Arduino UNO Q üzerinde çalışıyorum. "
        "Odandaki hareketi izliyorum.\n\n"
        "Komutlar:\n"
        "/durum - hareket durumu\n"
        "/hava - hava durumu\n"
        "/yardim - bu liste"
    )


def komut_yardim(sender: Sender, message: Message):
    sender.reply(
        "Komutlar:\n\n"
        "/durum - son hareket ne zaman oldu, kaç kez algılandı\n"
        f"/hava - {VARSAYILAN_SEHIR} için hava durumu\n"
        "/yardim - bu liste"
    )


def komut_durum(sender: Sender, message: Message):
    """Hareket geçmişini özetler."""
    calisma_suresi = sure_metni(time.time() - baslangic_zamani)

    if not hareket_gecmisi:
        sender.reply(
            "Henüz hiç hareket algılamadım.\n"
            f"{calisma_suresi}dir izliyorum."
        )
        return

    son_hareket = time.time() - hareket_gecmisi[-1]

    sender.reply(
        f"Son hareket: {sure_metni(son_hareket)} önce\n"
        f"Son 1 saatte: {son_bir_saatteki_hareket()} kez\n"
        f"Toplam kayıt: {len(hareket_gecmisi)}\n"
        f"Çalışma süresi: {calisma_suresi}"
    )


def komut_hava(sender: Sender, message: Message):
    """
    Hava durumunu getirir.

    Bu komut internet gerektiriyor — brick dış bir servise bağlanıyor.
    Bağlantı yoksa kullanıcıyı çökmek yerine bilgilendiriyoruz.
    """
    # Kullanıcı "/hava Ankara" yazabilir
    parcalar = (message.text or "").split(maxsplit=1)
    sehir = parcalar[1].strip() if len(parcalar) > 1 else VARSAYILAN_SEHIR

    try:
        tahmin = hava.get_forecast_by_city(sehir)
        sender.reply(f"{sehir}: {tahmin.category}\n{tahmin.description}")
    except Exception as hata:
        # Ağ hatası, bilinmeyen şehir, servis kapalı...
        print(f"Hava durumu alinamadi: {hata}")
        sender.reply(
            f"{sehir} icin hava durumu alinamadi. "
            "Sehir adini kontrol et ve kartin internete bagli oldugundan emin ol."
        )


def bilinmeyen_mesaj(sender: Sender, message: Message):
    """Komut olmayan metinlere cevap ver."""
    sender.reply("Bunu anlamadım. Komutları görmek için /yardim yaz.")


# ───────────────── Kayıt ─────────────────
bot.add_command("start", komut_start, "Botu başlat")
bot.add_command("durum", komut_durum, "Hareket durumunu göster")
bot.add_command("hava", komut_hava, "Hava durumunu göster")
bot.add_command("yardim", komut_yardim, "Komut listesi")
bot.on_text(bilinmeyen_mesaj)

Bridge.provide("hareket", hareket_algilandi)

bot.start()

print("Telegram bot hazir.")
print(f"Izinli kullanici sayisi: {len(IZINLI_KULLANICILAR)}")

App.run()
