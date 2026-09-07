// Proje 7 — Akıllı Priz arayüz mantığı
// Arduino UNO Q · assets/app.js

const roleBtn         = document.querySelector('#role-btn');
const renkInput       = document.querySelector('#renk');
const parlaklikInput  = document.querySelector('#parlaklik');
const parlaklikDeger  = document.querySelector('#parlaklik-deger');
const zamanlayiciEl   = document.querySelector('#zamanlayici-durum');
const baglantiEl      = document.querySelector('#baglanti');

const ui = new WebUI();

// Rölenin son bilinen durumu — düğmeye basınca tersini göndeririz
let roleAcik = false;

// ───────────────── Yardımcılar ─────────────────

// "#0078ff" → { r: 0, g: 120, b: 255 }
function hexToRgb(hex) {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}

// { r, g, b } → "#0078ff"
function rgbToHex({ r, g, b }) {
  const iki = (n) => n.toString(16).padStart(2, '0');
  return `#${iki(r)}${iki(g)}${iki(b)}`;
}

// Kaydırıcı ve renk seçici saniyede onlarca olay üretir; sadeleştiriyoruz.
function gecikmeli(fn, ms) {
  let zamanlayici = null;
  return (...args) => {
    clearTimeout(zamanlayici);
    zamanlayici = setTimeout(() => fn(...args), ms);
  };
}

// ───────────────── Röle ─────────────────

roleBtn.addEventListener('click', () => {
  // Mevcut durumun TERSİNİ gönder
  ui.send_message('role_ayarla', { on: !roleAcik });
});

// ───────────────── Zamanlayıcı ─────────────────

document.querySelectorAll('.sure').forEach((btn) => {
  btn.addEventListener('click', () => {
    const dakika = Number(btn.dataset.dakika);
    ui.send_message('zamanlayici_ayarla', { minutes: dakika });
  });
});

// ───────────────── Renk ve parlaklık ─────────────────

const renkGonder = gecikmeli((hex) => {
  ui.send_message('renk_ayarla', hexToRgb(hex));
}, 100);

renkInput.addEventListener('input', () => renkGonder(renkInput.value));

document.querySelectorAll('.hazir-renk').forEach((btn) => {
  btn.addEventListener('click', () => {
    const hex = btn.dataset.renk;
    renkInput.value = hex;                       // Seçiciyi de güncelle
    ui.send_message('renk_ayarla', hexToRgb(hex));
  });
});

const parlaklikGonder = gecikmeli((value) => {
  ui.send_message('parlaklik_ayarla', { brightness: value });
}, 100);

parlaklikInput.addEventListener('input', () => {
  const value = Number(parlaklikInput.value);
  parlaklikDeger.textContent = value;
  parlaklikGonder(value);
});

// ───────────────── Karttan gelen durum ─────────────────

ui.on_message('durum', (data) => {
  // Röle
  roleAcik = data.relay;
  roleBtn.textContent = roleAcik ? 'AÇIK' : 'KAPALI';
  roleBtn.className = `buyuk-buton ${roleAcik ? 'acik' : 'kapali'}`;

  // Zamanlayıcı
  zamanlayiciEl.textContent =
    data.timer > 0
      ? `${data.timer} dakika sonra kapanacak`
      : 'Zamanlayıcı kurulu değil';

  // Renk ve parlaklık
  renkInput.value = rgbToHex(data.color);
  parlaklikInput.value = data.brightness;
  parlaklikDeger.textContent = data.brightness;

  baglantiEl.textContent = 'Karta bağlı';
  baglantiEl.className = 'durum bagli';
});
