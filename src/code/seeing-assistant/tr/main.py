# Proje 10 — Gören ve Konuşan Asistan
# Arduino UNO Q  ·  python/main.py
#
# Ne yapar?
#   1. Kamerayı sürekli izler, tanıdığı nesneleri kaydeder
#   2. Mikrofonu dinler; "ne görüyorsun" gibi bir soru duyunca
#   3. Hoparlörden sesli cevap verir (İngilizce — tts brick'inde Türkçe ses yok)
#   4. Olan biteni web panelinde gösterir
#
# Dört brick birden çalışıyor ama her biri kendi işine bakıyor.
# Onları birbirine bağlayan tek şey aşağıdaki paylaşılan durum.

import time
from collections import deque

from arduino.app_utils import App, Bridge
from arduino.app_bricks.video_objectdetection import VideoObjectDetection
from arduino.app_bricks.asr import AutomaticSpeechRecognition
from arduino.app_bricks.tts import TextToSpeech
from arduino.app_bricks.web_ui import WebUI

# ───────────────── Ayarlar ─────────────────

# Tanıma güveni: 0.4 = "en az %40 eminsen bana söyle"
# Düşürürsen daha çok şey bulur ama yanılma payı artar.
GUVEN_ESIGI = 0.4

# Aynı nesneyi saniyede onlarca kez bildirmesin diye bekleme süresi
DEBOUNCE_SN = 1.5

# Mikrofonun her seferinde kaç saniye dinleyeceği
DINLEME_SURESI = 5

# Panelde gösterilecek olay sayısı
GUNLUK_BOYUTU = 40

# Nesne adlarının Türkçe karşılıkları — yalnızca PANEL için.
# Model İngilizce etiketler üretiyor. Sesli cevap İngilizce kalıyor, çünkü
# tts brick'inin ses modelleri arasında Türkçe yok.
TURKCE_ADLAR = {
    "person": "insan",
    "cat": "kedi",
    "dog": "köpek",
    "bottle": "şişe",
    "cup": "bardak",
    "chair": "sandalye",
    "book": "kitap",
    "laptop": "dizüstü bilgisayar",
    "cell phone": "telefon",
    "keyboard": "klavye",
    "mouse": "fare",
    "tv": "televizyon",
    "clock": "saat",
    "backpack": "sırt çantası",
    "scissors": "makas",
}

# Soruyu tanımak için aradığımız kelimeler.
# Konuşma tanıma her zaman birebir doğru sonuç vermez, bu yüzden
# tam cümle değil anahtar kelime arıyoruz.
GORME_KELIMELERI = ["gör", "gor", "ne var", "bak", "see"]

# ───────────────── Paylaşılan durum ─────────────────
# Dört brick'in de eriştiği tek yer burası.
durum = {
    "son_nesneler": {},      # {"insan": 0.87, "bardak": 0.66}  — panel için Türkçe
    "son_etiketler": {},     # {"person": 0.87, "cup": 0.66}    — sesli cevap için ham etiket
    "son_gorme": 0.0,        # zaman damgası
    "son_duyulan": "",       # mikrofonun anladığı son cümle
    "dinliyor": False,
}

gunluk = deque(maxlen=GUNLUK_BOYUTU)

# ───────────────── Brickler ─────────────────
kamera = VideoObjectDetection(confidence=GUVEN_ESIGI, debounce_sec=DEBOUNCE_SN)
mikrofon = AutomaticSpeechRecognition(language="tr")   # Türkçe soruları tanısın
ses = TextToSpeech()                                    # Türkçe ses modeli yok — İngilizce konuşur
ui = WebUI()


def gunluge_ekle(tur: str, metin: str):
    """Panelde gösterilecek olay günlüğüne bir satır ekler."""
    gunluk.append({
        "tur": tur,
        "metin": metin,
        "zaman": time.strftime("%H:%M:%S"),
    })
    ui.send_message("gunluk", {"kayitlar": list(gunluk)})


def turkcelestir(ad: str) -> str:
    """İngilizce nesne adını Türkçeye çevirir, bilmiyorsa olduğu gibi bırakır."""
    return TURKCE_ADLAR.get(ad, ad)


# ───────────────── Kamera ─────────────────

def nesneler_gorundu(tespitler: dict):
    """
    Kamera her tanıma yaptığında çağrılır.

    Brick her etiket için bir LİSTE verir — aynı nesneden birden fazla olabilir:
      {"person": [{"confidence": 0.87, "bounding_box_xyxy": (10, 20, 110, 220)}],
       "cup":    [{"confidence": 0.66, "bounding_box_xyxy": (...)}]}
    Biz her etiketin en yüksek güvenini alıp düz bir sözlüğe indiriyoruz.
    """
    if not tespitler:
        return

    en_yuksek = {
        ad: max(t["confidence"] for t in liste)
        for ad, liste in tespitler.items()
        if liste
    }
    if not en_yuksek:
        return

    # Ham İngilizce etiketler sesli cevap için, Türkçe karşılıklar panel için
    durum["son_etiketler"] = {ad: round(g, 2) for ad, g in en_yuksek.items()}
    durum["son_nesneler"] = {turkcelestir(ad): round(g, 2) for ad, g in en_yuksek.items()}
    durum["son_gorme"] = time.time()

    ui.send_message("durum", durum)
    gunluge_ekle("goruldu", ", ".join(durum["son_nesneler"].keys()))


def insan_gorundu():
    """
    "person" etiketi görüldüğünde çağrılır. Bu geri çağrı parametre almaz.
    Servoyu ortaya alıp dikkat kesiliyoruz.
    """
    Bridge.call("servo_merkez")
    gunluge_ekle("insan", "İnsan algılandı")


kamera.on_detect_all(nesneler_gorundu)
kamera.on_detect("person", insan_gorundu)


# ───────────────── Cevap üretme ─────────────────

def gordugunu_anlat() -> str:
    """
    Kameranın son gördüklerinden bir cümle kurar.

    Cümle İNGİLİZCE: tts brick'inde Türkçe ses modeli yok; Türkçe metni
    İngilizce sesle okutmak anlaşılmaz bir sonuç veriyor. Panel Türkçe kalıyor.
    """
    etiketler = durum["son_etiketler"]

    # Uzun süredir bir şey görmediysek eski bilgiyi doğru gibi sunmayalım
    if not etiketler or (time.time() - durum["son_gorme"]) > 10:
        return "I cannot see anything I recognise right now."

    adlar = list(etiketler.keys())

    if len(adlar) == 1:
        return f"I can see a {adlar[0]}."

    return f"I can see {', '.join('a ' + ad for ad in adlar[:-1])} and a {adlar[-1]}."


def konus(metin: str):
    """Hoparlörden konuşur ve panele de yazar."""
    print(f"Konusuyor: {metin}")
    gunluge_ekle("cevap", metin)
    ses.speak(metin)


# ───────────────── Mikrofon döngüsü ─────────────────

def dinle():
    """
    App.run(user_loop=...) bu fonksiyonu sürekli tekrar çağırır.
    Her turda 5 saniye dinleyip duyduğunu değerlendiriyoruz.
    """
    durum["dinliyor"] = True
    ui.send_message("durum", durum)

    try:
        duyulan = mikrofon.transcribe(duration=DINLEME_SURESI)
    except Exception as hata:
        # Mikrofon çıkarılmış olabilir; uygulamayı çökertmeyelim
        print(f"Mikrofon okunamadi: {hata}")
        time.sleep(2)
        return
    finally:
        durum["dinliyor"] = False

    if not duyulan or not duyulan.strip():
        return

    duyulan = duyulan.strip()
    durum["son_duyulan"] = duyulan
    ui.send_message("durum", durum)
    gunluge_ekle("duyuldu", duyulan)

    kucuk = duyulan.lower()

    if any(kelime in kucuk for kelime in GORME_KELIMELERI):
        konus(gordugunu_anlat())


# ───────────────── Web panelinden gelen ─────────────────

def panel_sordu(sid, data):
    """Kullanıcı panelden 'Ne görüyorsun?' düğmesine bastı."""
    konus(gordugunu_anlat())


def panel_konustur(sid, data):
    """Kullanıcı panele bir metin yazıp söylettirdi."""
    metin = str(data.get("text", "")).strip()[:200]
    if metin:
        konus(metin)


def baglandi(sid):
    ui.send_message("durum", durum)
    ui.send_message("gunluk", {"kayitlar": list(gunluk)})


ui.on_message("ne_goruyorsun", panel_sordu)
ui.on_message("konus", panel_konustur)
ui.on_connect(baglandi)


print("Asistan hazir. Kamera izliyor, mikrofon dinliyor.")
print(f"Guven esigi: {GUVEN_ESIGI}, dinleme suresi: {DINLEME_SURESI} sn")

# user_loop verildiğinde App.run() o fonksiyonu tekrar tekrar çağırır.
# Kamera ve web arayüzü ise kendi geri çağrılarıyla arka planda çalışmaya devam eder.
App.run(user_loop=dinle)
