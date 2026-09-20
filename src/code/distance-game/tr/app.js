// Proje 6 — Oyunun mantığı
// Arduino UNO Q · assets/app.js
//
// WebUI sınıfı arduino.js ile geliyor. Tek işi Python tarafıyla
// mesajlaşmak: send_message ile gönder, on_message ile dinle.
//
// Oyunun kendisi BURADA çalışıyor, kartta değil. Sebebi basit: gerçek bir
// çizim döngüsü sadece tarayıcıda var. Kartın işi ölçmek, LED yakmak ve
// buzzer çalmak — her kare için karta gidip gelmiyoruz.

const oyunCanvas = document.querySelector('#oyun');
const grafikCanvas = document.querySelector('#grafik');
const baslaBtn = document.querySelector('#basla');
const pencereInput = document.querySelector('#pencere');
const oyuncuInput = document.querySelector('#oyuncu');
const csvBtn = document.querySelector('#csv-indir');

const skorSatirlari = document.querySelector('#skor-satirlari');
const pencereOzeti = document.querySelector('#pencere-ozeti');

const pencereDeger = document.querySelector('#pencere-deger');
const puanEl = document.querySelector('#puan');
const sureEl = document.querySelector('#sure');
const turEl = document.querySelector('#tur');
const rekorEl = document.querySelector('#rekor');
const baglantiEl = document.querySelector('#baglanti');

const oyunCtx = oyunCanvas.getContext('2d');
const grafikCtx = grafikCanvas.getContext('2d');

const ui = new WebUI();

// ───────────────── Ayarlar ─────────────────
// Bu iki değer sketch'teki DIST_MIN / DIST_MAX ile aynı olmalı.
const MESAFE_MIN = 5;
const MESAFE_MAX = 60;

const OYUN_SURESI_MS = 60000;
const TUTMA_MS = 2000; // Turu kazanmak için bantta geçirilmesi gereken süre
const BANT_BASLANGIC = 16; // cm — ilk turun bant genişliği
const BANT_AZALMA = 2; // Her turda bu kadar daralır
const BANT_EN_DAR = 6;
const PUAN_ARALIGI_MS = 100; // Bantta her 100 ms'de 1 puan

const MAX_IZ = 160; // Grafikte kaç ölçüm görünsün

const RENK_HAM = '#e0533f';
const RENK_ORTALAMA = '#26b5ba';

// ───────────────── Durum ─────────────────
let sonHam = MESAFE_MAX;
let sonOrtalama = MESAFE_MAX;
let izler = [];

let oyunda = false;
let kalanMs = OYUN_SURESI_MS;
let puan = 0;
let tur = 1;
let tutmaMs = 0;
let puanBirikimiMs = 0;

let hedefYakin = 0;
let hedefUzak = 0;

let sonKare = 0;
let sonOlcumZamani = 0;

// Karttan gelen skor tablosu
let skorlar = [];

// ───────────────── Canvas'ı keskinleştir ─────────────────
// Retina ekranlarda CSS pikseli ile gerçek piksel farklıdır.
// Bunu ayarlamazsak çizim bulanık görünür.
function canvasBoyutlandir(canvas, ctx) {
  const oran = window.devicePixelRatio || 1;
  canvas.width = canvas.clientWidth * oran;
  canvas.height = canvas.clientHeight * oran;
  ctx.setTransform(oran, 0, 0, oran, 0, 0);
}

function hepsiniBoyutlandir() {
  canvasBoyutlandir(oyunCanvas, oyunCtx);
  canvasBoyutlandir(grafikCanvas, grafikCtx);
}

window.addEventListener('resize', hepsiniBoyutlandir);

// ───────────────── Yardımcılar ─────────────────

// Mesafeyi 0 (en alt) ile 1 (en üst) arasına çevirir.
function yukseklik(cm) {
  const oran = (cm - MESAFE_MIN) / (MESAFE_MAX - MESAFE_MIN);
  return Math.min(1, Math.max(0, oran));
}

// Karttan saniyede ~16 ölçüm geliyor. Bir saniyeden fazla ses çıkmazsa
// ya WiFi koptu ya da uygulama durdu — oyuncuya söylemek gerekir.
function baglantiyiDenetle(simdi) {
  if (!sonOlcumZamani) return;

  const sessizlik = simdi - sonOlcumZamani;

  if (sessizlik > 1500 && baglantiEl.className !== 'durum hata') {
    baglantiEl.textContent = 'Karttan veri gelmiyor';
    baglantiEl.className = 'durum hata';
  }
}

function gecikmeli(fn, ms) {
  let zamanlayici = null;
  return (...args) => {
    clearTimeout(zamanlayici);
    zamanlayici = setTimeout(() => fn(...args), ms);
  };
}

// ───────────────── Tur yönetimi ─────────────────

function bantGenisligi() {
  return Math.max(BANT_EN_DAR, BANT_BASLANGIC - (tur - 1) * BANT_AZALMA);
}

function yeniTur() {
  const genislik = bantGenisligi();

  // Bandın merkezi menzilin içinde kalmalı; kenarlara yapışırsa
  // oyuncu elini yetiştiremez.
  const enAz = MESAFE_MIN + genislik / 2 + 3;
  const enCok = MESAFE_MAX - genislik / 2 - 3;
  const merkez = enAz + Math.random() * (enCok - enAz);

  hedefYakin = merkez - genislik / 2;
  hedefUzak = merkez + genislik / 2;
  tutmaMs = 0;

  turEl.textContent = tur;

  // Hedefi karta da bildir: LED'leri ve matristeki parantezi kart kendi
  // ölçümüyle sürecek, böylece her kare için ağ turu atmıyoruz.
  ui.send_message('hedef_ayarla', { yakin: hedefYakin, uzak: hedefUzak });
}

function oyunuBaslat() {
  oyunda = true;
  puan = 0;
  tur = 1;
  kalanMs = OYUN_SURESI_MS;
  puanBirikimiMs = 0;

  puanEl.textContent = '0';
  baslaBtn.textContent = 'DURDUR';
  baslaBtn.classList.remove('kapali');
  baslaBtn.classList.add('acik');

  yeniTur();
}

function oyunuBitir() {
  oyunda = false;
  baslaBtn.textContent = 'BAŞLA';
  baslaBtn.classList.remove('acik');
  baslaBtn.classList.add('kapali');

  // Adı da gönderiyoruz; skoru kim aldı belli olsun.
  ui.send_message('skor_bildir', { puan, tur, ad: oyuncuInput.value });
  ui.send_message('hedefi_temizle', {});
}

// ───────────────── Oyuncu adı ─────────────────
// Adı tarayıcıda hatırlıyoruz ki her oyunda yeniden yazılmasın.
// Bu yalnızca bir kolaylık; asıl kayıt kartın üzerindeki dosyada.
const AD_ANAHTARI = 'uno-q:mesafe-oyunu:oyuncu';

try {
  const kayitli = localStorage.getItem(AD_ANAHTARI);
  if (kayitli) oyuncuInput.value = kayitli;
} catch {
  /* Gizli pencerede depolama kapalı olabilir; oyun yine de çalışır. */
}

oyuncuInput.addEventListener('change', () => {
  try {
    localStorage.setItem(AD_ANAHTARI, oyuncuInput.value);
  } catch {
    /* Hatırlanmasa da olur. */
  }
});

baslaBtn.addEventListener('click', () => {
  if (oyunda) oyunuBitir();
  else oyunuBaslat();
});

// ───────────────── Ortalama penceresi ─────────────────

// Kaydırıcı sürüklenirken saniyede onlarca olay üretir.
// Her birini karta göndermek gereksiz; küçük bir gecikmeyle sadeleştiriyoruz.
const pencereGonder = gecikmeli((value) => {
  ui.send_message('pencere_ayarla', { pencere: value });
}, 120);

pencereInput.addEventListener('input', () => {
  const value = Number(pencereInput.value);
  pencereDeger.textContent = value;
  pencereGonder(value);
});

// ───────────────── Oyun döngüsü ─────────────────

function kare(simdi) {
  // Sekme arka plana düşünce ya da telefon kilitlenince tarayıcı çizimi
  // durdurur. Geri döndüğünde aradan saniyeler geçmiş olur; sınırlamazsak
  // balon ışınlanır ve tur bir anda biter.
  const gecen = Math.min(50, sonKare ? simdi - sonKare : 0);
  sonKare = simdi;

  baglantiyiDenetle(simdi);

  if (oyunda) {
    kalanMs -= gecen;

    if (kalanMs <= 0) {
      kalanMs = 0;
      oyunuBitir();
    } else {
      // Balon hangi değeri takip ediyorsa puan da ona göre verilmeli.
      const bantta = sonOrtalama >= hedefYakin && sonOrtalama <= hedefUzak;

      if (bantta) {
        tutmaMs += gecen;
        puanBirikimiMs += gecen;

        while (puanBirikimiMs >= PUAN_ARALIGI_MS) {
          puanBirikimiMs -= PUAN_ARALIGI_MS;
          puan++;
        }

        if (tutmaMs >= TUTMA_MS) {
          // Tur kazanıldı: karttaki buzzer kutlasın, bant daralsın
          ui.send_message('kutla', {});
          puan += 10;
          tur++;
          yeniTur();
        }
      } else {
        tutmaMs = 0;
        puanBirikimiMs = 0;
      }

      puanEl.textContent = puan;
    }

    sureEl.textContent = Math.ceil(kalanMs / 1000);
  }

  oyunuCiz();
  grafigiCiz();

  requestAnimationFrame(kare);
}

// ───────────────── Oyun alanını çiz ─────────────────

function oyunuCiz() {
  const g = oyunCanvas.clientWidth;
  const y = oyunCanvas.clientHeight;

  oyunCtx.clearRect(0, 0, g, y);

  // Zemin
  oyunCtx.fillStyle = 'rgba(255, 255, 255, 0.03)';
  oyunCtx.fillRect(0, 0, g, y);

  // Hedef bandı
  if (oyunda) {
    const ust = (1 - yukseklik(hedefUzak)) * y;
    const alt = (1 - yukseklik(hedefYakin)) * y;

    // Bantta geçirilen süre doldukça bant belirginleşir
    const dolgu = Math.min(1, tutmaMs / TUTMA_MS);

    oyunCtx.fillStyle = `rgba(38, 181, 186, ${0.14 + dolgu * 0.3})`;
    oyunCtx.fillRect(0, ust, g, alt - ust);

    oyunCtx.strokeStyle = RENK_ORTALAMA;
    oyunCtx.lineWidth = 2;
    oyunCtx.beginPath();
    oyunCtx.moveTo(0, ust);
    oyunCtx.lineTo(g, ust);
    oyunCtx.moveTo(0, alt);
    oyunCtx.lineTo(g, alt);
    oyunCtx.stroke();
  }

  // Ham ölçümün nerede olduğunu soluk bir çizgiyle göster.
  // Pencere 1'deyken bu çizgi ile balon üst üste durur; pencereyi
  // büyüttükçe balonun geride kaldığını buradan görürsün.
  const hamY = (1 - yukseklik(sonHam)) * y;
  oyunCtx.strokeStyle = 'rgba(224, 83, 63, 0.45)';
  oyunCtx.lineWidth = 1;
  oyunCtx.setLineDash([4, 4]);
  oyunCtx.beginPath();
  oyunCtx.moveTo(0, hamY);
  oyunCtx.lineTo(g, hamY);
  oyunCtx.stroke();
  oyunCtx.setLineDash([]);

  // Balon — YUMUŞATMA YOK.
  // Balonu çizimde kaydırarak yumuşatmak kolay olurdu ama o zaman ham
  // ölçümün titremesi görünmezdi. Balon tam olarak karttan gelen son
  // değerde duruyor; titriyorsa veri gerçekten titriyordur.
  const balonY = (1 - yukseklik(sonOrtalama)) * y;
  const balonX = g / 2;

  oyunCtx.fillStyle = '#ffd166';
  oyunCtx.beginPath();
  oyunCtx.ellipse(balonX, balonY, 16, 20, 0, 0, Math.PI * 2);
  oyunCtx.fill();

  // İp
  oyunCtx.strokeStyle = 'rgba(255, 209, 102, 0.5)';
  oyunCtx.lineWidth = 1.5;
  oyunCtx.beginPath();
  oyunCtx.moveTo(balonX, balonY + 20);
  oyunCtx.lineTo(balonX, balonY + 34);
  oyunCtx.stroke();
}

// ───────────────── Grafiği çiz ─────────────────

function grafigiCiz() {
  const g = grafikCanvas.clientWidth;
  const y = grafikCanvas.clientHeight;

  grafikCtx.clearRect(0, 0, g, y);

  if (izler.length < 2) return;

  const adimX = g / (MAX_IZ - 1);

  const ciz = (anahtar, renk, kalinlik) => {
    grafikCtx.strokeStyle = renk;
    grafikCtx.lineWidth = kalinlik;
    grafikCtx.beginPath();

    izler.forEach((kayit, i) => {
      // En yeni ölçüm sağa yapışsın
      const px = g - (izler.length - 1 - i) * adimX;
      const py = (1 - yukseklik(kayit[anahtar])) * y;

      if (i === 0) grafikCtx.moveTo(px, py);
      else grafikCtx.lineTo(px, py);
    });

    grafikCtx.stroke();
  };

  ciz('ham', RENK_HAM, 1);
  ciz('ortalama', RENK_ORTALAMA, 2);
}

// ───────────────── Skor tablosu ─────────────────

function skorlariCiz() {
  if (skorlar.length === 0) {
    skorSatirlari.innerHTML = '<tr class="bos"><td colspan="6">Bir oyun bitir, ilk kayıt senin olsun.</td></tr>';
    pencereOzeti.textContent = 'Henüz kayıtlı oyun yok.';
    return;
  }

  const benimAdim = oyuncuInput.value.trim();

  skorSatirlari.innerHTML = '';

  skorlar.forEach((kayit, i) => {
    const satir = document.createElement('tr');
    if (benimAdim && kayit.ad === benimAdim) satir.className = 'benim';

    // Hücreleri textContent ile dolduruyoruz. Oyuncu adı tarayıcıdan geldi;
    // innerHTML kullansaydık yazdığın metin HTML olarak çalıştırılabilirdi.
    [i + 1, kayit.ad, kayit.puan, kayit.tur, kayit.pencere, kayit.zaman].forEach((deger) => {
      const hucre = document.createElement('td');
      hucre.textContent = deger;
      satir.appendChild(hucre);
    });

    skorSatirlari.appendChild(satir);
  });

  pencereOzetiniCiz();
}

// Tablonun asıl marifeti: ortalamanın işe yarayıp yaramadığını veriyle söylemek.
function pencereOzetiniCiz() {
  const ham = skorlar.filter((k) => k.pencere === 1);
  const ortalamali = skorlar.filter((k) => k.pencere > 1);

  const ortalama = (liste) => Math.round(liste.reduce((toplam, k) => toplam + k.puan, 0) / liste.length);

  if (ham.length === 0 || ortalamali.length === 0) {
    pencereOzeti.textContent =
      `${skorlar.length} oyun kayıtlı. İki modu da dene — tablo hangisinin daha çok puan getirdiğini söyleyecek.`;
    return;
  }

  pencereOzeti.textContent =
    `Ham ölçümle (pencere 1): ${ham.length} oyun, ortalama ${ortalama(ham)} puan · ` +
    `Ortalamalı (pencere 2+): ${ortalamali.length} oyun, ortalama ${ortalama(ortalamali)} puan.`;
}

csvBtn.addEventListener('click', () => {
  if (skorlar.length === 0) return;

  const satirlar = [
    'sira,oyuncu,puan,tur,pencere,zaman',
    // Ad virgül içerebilir; tırnak içine alıp içindeki tırnakları ikiliyoruz.
    ...skorlar.map((k, i) => `${i + 1},"${String(k.ad).replace(/"/g, '""')}",${k.puan},${k.tur},${k.pencere},${k.zaman}`),
  ];

  const blob = new Blob([satirlar.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const baglanti = document.createElement('a');
  baglanti.href = url;
  baglanti.download = 'skorlar.csv';
  baglanti.click();

  // Tarayıcının belleği boşaltabilmesi için adresi serbest bırak
  URL.revokeObjectURL(url);
});

// ───────────────── Karttan gelen mesajlar ─────────────────

// Saniyede ~16 ölçüm geliyor. Her biri tek bir örnek; geçmişi
// tarayıcı kendi halka tamponunda tutuyor.
ui.on_message('olcum', (data) => {
  sonHam = data.ham;
  sonOrtalama = data.ortalama;
  sonOlcumZamani = performance.now();

  izler.push(data);
  if (izler.length > MAX_IZ) izler.shift();

  baglantiEl.textContent = 'Karta bağlı';
  baglantiEl.className = 'durum bagli';
});

// Bağlanınca tüm tablo bir kerede gelir, sonra her yeni skorda yenilenir.
ui.on_message('skorlar', (data) => {
  skorlar = data.kayitlar || [];
  skorlariCiz();
});

ui.on_message('durum', (data) => {
  rekorEl.textContent = data.enIyiSkor;

  pencereInput.value = data.pencere;
  pencereDeger.textContent = data.pencere;

  baglantiEl.textContent = 'Karta bağlı';
  baglantiEl.className = 'durum bagli';
});

// ───────────────── Başlat ─────────────────
hepsiniBoyutlandir();
requestAnimationFrame(kare);
