// Proje 8 — Canlı Sensör Paneli arayüzü
// Arduino UNO Q · assets/app.js
//
// Grafiği hiçbir kütüphane kullanmadan, doğrudan canvas üzerine çiziyoruz.
// Böylece panel internet bağlantısı olmadan da çalışıyor.

const canvas      = document.querySelector('#grafik');
const ctx         = canvas.getContext('2d');
const baglantiEl  = document.querySelector('#baglanti');
const kayitSayisi = document.querySelector('#kayit-sayisi');

const vSicaklik = document.querySelector('#v-sicaklik');
const vNem      = document.querySelector('#v-nem');
const vIsik     = document.querySelector('#v-isik');

const ui = new WebUI();

// Ekranda gösterilen ölçümler
let kayitlar = [];
const MAX_KAYIT = 150;

// ───────────────── Grafik ayarları ─────────────────
const SERILER = [
  { anahtar: 't', renk: '#e0533f', ad: 'Sıcaklık' },
  { anahtar: 'h', renk: '#0d8ce0', ad: 'Nem' },
  { anahtar: 'l', renk: '#e0a91a', ad: 'Işık' },
];

// Üç ölçüm de 0-100 aralığında çizilir
const Y_MIN = 0;
const Y_MAX = 100;

const KENAR = { ust: 16, sag: 16, alt: 28, sol: 36 };

// ───────────────── Canvas'ı keskinleştir ─────────────────
// Retina ekranlarda CSS pikseli ile gerçek piksel farklıdır.
// Bunu ayarlamazsak grafik bulanık görünür.
function canvasBoyutlandir() {
  const oran = window.devicePixelRatio || 1;
  const genislik = canvas.clientWidth;
  const yukseklik = canvas.clientHeight;

  canvas.width = genislik * oran;
  canvas.height = yukseklik * oran;

  ctx.setTransform(oran, 0, 0, oran, 0, 0);
  ciz();
}

window.addEventListener('resize', canvasBoyutlandir);

// ───────────────── Çizim ─────────────────

function ciz() {
  const g = canvas.clientWidth;
  const y = canvas.clientHeight;

  ctx.clearRect(0, 0, g, y);

  const alanG = g - KENAR.sol - KENAR.sag;
  const alanY = y - KENAR.ust - KENAR.alt;

  // ── Yatay ızgara ve Y ekseni etiketleri ──
  ctx.strokeStyle = 'rgba(128,145,150,0.25)';
  ctx.fillStyle = 'rgba(128,145,150,0.9)';
  ctx.lineWidth = 1;
  ctx.font = '11px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  for (let deger = Y_MIN; deger <= Y_MAX; deger += 25) {
    const py = KENAR.ust + alanY - ((deger - Y_MIN) / (Y_MAX - Y_MIN)) * alanY;

    ctx.beginPath();
    ctx.moveTo(KENAR.sol, py);
    ctx.lineTo(KENAR.sol + alanG, py);
    ctx.stroke();

    ctx.fillText(String(deger), KENAR.sol - 8, py);
  }

  // Yeterli veri yoksa burada dur
  if (kayitlar.length < 2) {
    ctx.textAlign = 'center';
    ctx.fillText('Ölçüm bekleniyor…', g / 2, y / 2);
    return;
  }

  // ── Her seri için bir çizgi ──
  const adimX = alanG / (MAX_KAYIT - 1);

  for (const seri of SERILER) {
    ctx.beginPath();
    ctx.strokeStyle = seri.renk;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';

    kayitlar.forEach((kayit, i) => {
      const deger = Math.max(Y_MIN, Math.min(Y_MAX, kayit[seri.anahtar]));

      // En yeni ölçüm sağda olsun diye sağdan sola yerleştiriyoruz
      const px = KENAR.sol + alanG - (kayitlar.length - 1 - i) * adimX;
      const py = KENAR.ust + alanY - ((deger - Y_MIN) / (Y_MAX - Y_MIN)) * alanY;

      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });

    ctx.stroke();
  }

  // ── X ekseni: en eski ve en yeni saat ──
  ctx.fillStyle = 'rgba(128,145,150,0.9)';
  ctx.textBaseline = 'top';

  ctx.textAlign = 'left';
  ctx.fillText(kayitlar[0].zaman, KENAR.sol, y - KENAR.alt + 8);

  ctx.textAlign = 'right';
  ctx.fillText(kayitlar[kayitlar.length - 1].zaman, KENAR.sol + alanG, y - KENAR.alt + 8);
}

// ───────────────── Anlık değerler ─────────────────

function anlikDegerleriGuncelle(kayit) {
  vSicaklik.textContent = kayit.t.toFixed(1);
  vNem.textContent = kayit.h;
  vIsik.textContent = kayit.l;
}

// ───────────────── Karttan gelen mesajlar ─────────────────

// Bağlanınca tüm geçmiş bir kerede gelir
ui.on_message('gecmis', (data) => {
  kayitlar = data.kayitlar || [];

  if (kayitlar.length > 0) {
    anlikDegerleriGuncelle(kayitlar[kayitlar.length - 1]);
  }

  kayitSayisi.textContent = kayitlar.length;

  baglantiEl.textContent = 'Karta bağlı';
  baglantiEl.className = 'durum bagli';

  ciz();
});

// Sonrasında her yeni ölçüm tek tek gelir
ui.on_message('olcum', (kayit) => {
  kayitlar.push(kayit);

  // Bellekte sınırı aşarsa en eskiyi at
  if (kayitlar.length > MAX_KAYIT) {
    kayitlar.shift();
  }

  anlikDegerleriGuncelle(kayit);
  kayitSayisi.textContent = kayitlar.length;
  ciz();
});

// ───────────────── CSV indirme ─────────────────

document.querySelector('#csv-indir').addEventListener('click', () => {
  if (kayitlar.length === 0) return;

  const satirlar = [
    'zaman,sicaklik_C,nem_yuzde,isik_yuzde',
    ...kayitlar.map((k) => `${k.zaman},${k.t},${k.h},${k.l}`),
  ];

  const blob = new Blob([satirlar.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const baglanti = document.createElement('a');
  baglanti.href = url;
  baglanti.download = 'olcumler.csv';
  baglanti.click();

  // Tarayıcının belleği boşaltabilmesi için adresi serbest bırak
  URL.revokeObjectURL(url);
});

// İlk çizim
canvasBoyutlandir();
