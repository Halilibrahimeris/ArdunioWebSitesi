# Arduino UNO Q Projeleri / Projects

Arduino UNO Q için 10 uygulamalı projeden oluşan, Türkçe ve İngilizce iki dilli
eğitim sitesi. Her projede adım adım anlatım, bağlantı şeması, malzeme listesi
ve açıklamalı kod var.

A bilingual (Turkish/English) tutorial site with 10 hands-on Arduino UNO Q
projects. Every project has step-by-step instructions, a wiring diagram, a parts
list and well-commented code.

---

## Çalıştırma / Running

```bash
npm install
npm run dev        # http://localhost:4321
```

```bash
npm run build      # astro check + statik derleme -> dist/
npm run preview    # derlenmiş siteyi önizle
```

`npm run build` içinde `astro check` de çalışır: tip hataları, eksik çeviri
anahtarları ve içerik şeması hataları burada yakalanır.

---

## Proje yapısı / Project structure

```
src/
├── data/
│   ├── parts.ts          Malzeme kataloğu (tek kaynak)
│   └── projects.ts       Proje meta verisi: sıra, zorluk, malzeme, kod dosyaları
├── content/
│   ├── projects/tr|en/   Proje anlatımları (MDX) — yalnızca metin
│   └── guides/tr|en/     Rehberler (MDX)
├── code/
│   └── <proje-id>/tr|en/ Gerçek kod dosyaları (.ino, .py, .yaml, .html, .js, .css)
├── diagrams/             Gömülen SVG bağlantı şemaları
├── components/           Astro bileşenleri
├── i18n/                 Arayüz metinleri (ui.ts) ve yardımcılar
└── pages/[lang]/         Sayfa yönlendirmeleri
```

### Tasarımın ana kuralı

**Dilden bağımsız her şey tek yerde durur.** Malzemeler `parts.ts`'te, proje
meta verisi `projects.ts`'te, şemalar `diagrams/`'da. Markdown dosyaları
yalnızca çevrilmesi gereken düzyazıyı taşır.

Bir malzemenin adı veya bir şema değiştiğinde tek dosyayı düzenlersin ve
**iki dil birden** güncellenir.

---

## Yeni proje eklemek / Adding a project

1. `src/data/projects.ts` içine yeni bir kayıt ekle (id, slug, zorluk, `bom`, `codeFiles`)
2. `src/code/<proje-id>/tr/` ve `.../en/` altına kod dosyalarını koy
3. `src/diagrams/` altına SVG şemayı ekle
4. `src/content/projects/tr/<proje-id>.mdx` ve `en/` karşılığını yaz

`projectId` şema tarafından doğrulanır — yazım hatası yaparsan derleme durur.

## Yeni malzeme eklemek

`src/data/parts.ts` içine ekle. `voltageRisk` alanı önemli:

- `safe` — 3.3V ile doğrudan bağlanır
- `caution` — çalışır ama dikkat gerekir
- `danger` — ek devre olmadan bağlanırsa kartı bozar

Bu değer malzeme tablolarında otomatik olarak renkli rozete dönüşür.

---

## Görseller / Images

Şemalar `src/diagrams/` altında SVG olarak durur ve sayfaya **gömülür** —
böylece CSS değişkenlerine erişip karanlık modda da okunur kalırlar.

Fotoğraf eklemek için: dosyayı `public/photos/` altına koy ve MDX içindeki
`<PhotoSlot>` bileşenine `src` ver:

```mdx
<PhotoSlot lang="tr" src="devre-01.jpg" caption="Kurulmuş devre" />
```

`src` verilmezse yer tutucu görünür.

---

## Yayına alma / Deployment

`astro.config.mjs` içindeki `SITE` değişkenini kendi adresinle değiştir —
canonical bağlantılar ve site haritası bunu kullanır.

```js
const SITE = 'https://kullanici-adin.github.io/depo-adi';
```

GitHub Pages kullanacaksan `base` ayarını da eklemen gerekebilir. Depo kökünde
yayınlıyorsan gerekmez.

Çıktı tamamen statiktir; `dist/` klasörünü herhangi bir statik sunucuya
yükleyebilirsin.

---

## Kodların durumu / Status of the code

Proje kodları, Arduino'nun resmî
[app-bricks-examples](https://github.com/arduino/app-bricks-examples)
deposundaki doğrulanmış API kullanımlarına dayanır — Bridge, brick isimleri,
LED matris çerçeve API'si ve `Monitor` sınıfı oradan alınmıştır.

Ancak **kodlar henüz gerçek donanımda çalıştırılmadı.** Her proje sayfasındaki
kod bölümünde bu not görünür. Kart elinize geçtiğinde sırayla doğrulamanız
önerilir.

---

## Teknoloji / Stack

- [Astro](https://astro.build) — statik site üretimi, i18n yönlendirme
- MDX — anlatım içeriği + gömülü bileşenler
- Tailwind CSS 4 — arayüz
- Shiki — kod renklendirme (açık/koyu çift tema)
- Zod — içerik şeması doğrulama
