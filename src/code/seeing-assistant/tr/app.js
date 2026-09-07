// Proje 10 — Asistan paneli
// Arduino UNO Q · assets/app.js

const nesnelerEl     = document.querySelector('#nesneler');
const gunlukEl       = document.querySelector('#gunluk');
const dinlemeEl      = document.querySelector('#dinleme-durumu');
const sonDuyulanEl   = document.querySelector('#son-duyulan');
const baglantiEl     = document.querySelector('#baglanti');
const metinInput     = document.querySelector('#metin');

const ui = new WebUI();

// Günlük satırlarının başına konacak simgeler
const SIMGELER = {
  goruldu: '👁️',
  insan: '🧍',
  duyuldu: '🎤',
  cevap: '🔈',
};

// ───────────────── Panelden karta ─────────────────

document.querySelector('#sor').addEventListener('click', () => {
  ui.send_message('ne_goruyorsun', {});
});

function soylet() {
  const text = metinInput.value.trim();
  if (!text) return;

  ui.send_message('konus', { text });
  metinInput.value = '';
}

document.querySelector('#soylet').addEventListener('click', soylet);
metinInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') soylet();
});

// ───────────────── Karttan panele ─────────────────

ui.on_message('durum', (durum) => {
  // Tanınan nesneler
  const nesneler = durum.son_nesneler || {};
  const adlar = Object.keys(nesneler);

  nesnelerEl.innerHTML = '';

  if (adlar.length === 0) {
    const li = document.createElement('li');
    li.className = 'bos';
    li.textContent = 'Henüz bir şey tanımadı';
    nesnelerEl.appendChild(li);
  } else {
    for (const ad of adlar) {
      const li = document.createElement('li');

      const isim = document.createElement('span');
      isim.className = 'ad';
      isim.textContent = ad;

      // Güven yüzdesini bir çubukla göster
      const cubuk = document.createElement('span');
      cubuk.className = 'guven';
      cubuk.style.width = `${Math.round(nesneler[ad] * 100)}%`;
      cubuk.title = `%${Math.round(nesneler[ad] * 100)} güven`;

      li.append(isim, cubuk);
      nesnelerEl.appendChild(li);
    }
  }

  // Mikrofon durumu
  dinlemeEl.textContent = durum.dinliyor ? 'Dinliyor…' : 'Bekliyor';
  sonDuyulanEl.textContent = durum.son_duyulan || '—';

  baglantiEl.textContent = 'Karta bağlı';
  baglantiEl.className = 'durum bagli';
});

ui.on_message('gunluk', (data) => {
  const kayitlar = data.kayitlar || [];

  gunlukEl.innerHTML = '';

  // En yeni olay en üstte olsun
  for (const kayit of [...kayitlar].reverse()) {
    const li = document.createElement('li');
    li.className = kayit.tur;

    const simge = document.createElement('span');
    simge.className = 'simge';
    simge.textContent = SIMGELER[kayit.tur] || '•';

    const zaman = document.createElement('span');
    zaman.className = 'zaman';
    zaman.textContent = kayit.zaman;

    const metin = document.createElement('span');
    metin.className = 'metin';
    metin.textContent = kayit.metin;

    li.append(simge, zaman, metin);
    gunlukEl.appendChild(li);
  }
});
