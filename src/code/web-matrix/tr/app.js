// Proje 6 — Web arayüzünün mantığı
// Arduino UNO Q · assets/app.js
//
// WebUI sınıfı arduino.js ile geliyor. Tek işi Python tarafıyla
// mesajlaşmak: send_message ile gönder, on_message ile dinle.

const metinInput     = document.querySelector('#metin');
const gonderBtn      = document.querySelector('#gonder');
const parlaklikInput = document.querySelector('#parlaklik');
const hizInput       = document.querySelector('#hiz');

const parlaklikDeger = document.querySelector('#parlaklik-deger');
const hizDeger       = document.querySelector('#hiz-deger');
const simdikiMetin   = document.querySelector('#simdiki-metin');
const baglantiEl     = document.querySelector('#baglanti');

const ui = new WebUI();

// ───────────────── Python'a gönderilenler ─────────────────

function metniGonder() {
  const text = metinInput.value.trim();
  if (!text) return;

  // Python tarafındaki ui.on_message("yazi_ayarla", ...) bunu yakalar
  ui.send_message('yazi_ayarla', { text });
}

gonderBtn.addEventListener('click', metniGonder);

// Enter'a basınca da gönder
metinInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') metniGonder();
});

// Kaydırıcılar sürüklenirken saniyede onlarca olay üretir.
// Her birini karta göndermek gereksiz; küçük bir gecikmeyle sadeleştiriyoruz.
function gecikmeli(fn, ms) {
  let zamanlayici = null;
  return (...args) => {
    clearTimeout(zamanlayici);
    zamanlayici = setTimeout(() => fn(...args), ms);
  };
}

const parlaklikGonder = gecikmeli((value) => {
  ui.send_message('parlaklik_ayarla', { brightness: value });
}, 120);

const hizGonder = gecikmeli((value) => {
  ui.send_message('hiz_ayarla', { speed: value });
}, 120);

parlaklikInput.addEventListener('input', () => {
  const value = Number(parlaklikInput.value);
  parlaklikDeger.textContent = value;      // Etiketi anında güncelle
  parlaklikGonder(value);                  // Karta gecikmeli gönder
});

hizInput.addEventListener('input', () => {
  const value = Number(hizInput.value);
  hizDeger.textContent = value;
  hizGonder(value);
});

// ───────────────── Python'dan gelenler ─────────────────

// Kart bağlandığında ve her değişiklikte güncel durumu gönderiyor.
// Böylece iki telefondan aynı anda açsan bile ikisi de senkron kalır.
ui.on_message('durum', (data) => {
  simdikiMetin.textContent = data.text || '—';

  parlaklikInput.value = data.brightness;
  parlaklikDeger.textContent = data.brightness;

  hizInput.value = data.speed;
  hizDeger.textContent = data.speed;

  baglantiEl.textContent = 'Karta bağlı';
  baglantiEl.className = 'durum bagli';
});

ui.on_message('hata', (data) => {
  baglantiEl.textContent = data.mesaj;
  baglantiEl.className = 'durum hata';
});
