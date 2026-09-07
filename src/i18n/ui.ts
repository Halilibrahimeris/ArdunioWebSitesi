/**
 * Tüm arayüz metinleri / All UI strings.
 * Yeni bir metin eklerken HER İKİ dile de ekle — tip sistemi eksikleri yakalar.
 * When adding a string, add it to BOTH languages — the type system catches gaps.
 */

export const languages = {
  tr: 'Türkçe',
  en: 'English',
} as const;

export type Lang = keyof typeof languages;
export const defaultLang: Lang = 'tr';
export const locales = Object.keys(languages) as Lang[];

export const ui = {
  tr: {
    'site.title': 'Arduino UNO Q Projeleri',
    'site.tagline': 'Adım adım, 10 uygulamalı proje',
    'site.description':
      'Arduino UNO Q ile 10 uygulamalı proje: adım adım anlatım, bağlantı şemaları, malzeme listeleri ve açıklamalı kodlar. WiFi destekli ve internetsiz projeler.',

    'nav.home': 'Ana Sayfa',
    'nav.projects': 'Projeler',
    'nav.guides': 'Rehberler',
    'nav.parts': 'Malzemeler',
    'nav.skipToContent': 'İçeriğe geç',
    'nav.menu': 'Menü',
    'nav.close': 'Kapat',

    'theme.toggle': 'Temayı değiştir',
    'lang.switch': 'Dili değiştir',
    'lang.label': 'Dil',

    'home.hero.badge': 'Qualcomm Dragonwing + STM32 · Linux + Arduino',
    'home.hero.title': 'Arduino UNO Q ile 10 Proje',
    'home.hero.subtitle':
      'Tek kartta hem Linux bilgisayar hem Arduino. Sıfırdan başlayıp WiFi üzerinden kontrol edilen ve yapay zekâ kullanan projelere kadar, her adımı şema ve kodla anlatıyoruz.',
    'home.hero.cta': 'İlk projeye başla',
    'home.hero.ctaSecondary': 'Önce rehberleri oku',

    'home.stats.projects': 'proje',
    'home.stats.offline': 'internetsiz',
    'home.stats.wifi': 'WiFi destekli',
    'home.stats.languages': 'dil',

    'home.projects.title': 'Projeler',
    'home.projects.subtitle': 'Kolaydan zora sıralandı. Sırayla ilerlemeni öneririz.',
    'home.guides.title': 'Başlamadan Önce',
    'home.guides.subtitle': 'Kartı tanı, kurulumu yap, güvenlik kurallarını öğren.',

    'filter.all': 'Tümü',
    'filter.title': 'Filtrele',
    'filter.category': 'Kategori',
    'filter.difficulty': 'Zorluk',
    'filter.noResults': 'Bu filtreye uygun proje yok.',
    'filter.showing': 'proje gösteriliyor',

    'category.offline': 'İnternet gerekmez',
    'category.offline.short': 'Çevrimdışı',
    'category.bridge': 'Bridge (MCU+MPU)',
    'category.bridge.short': 'Bridge',
    'category.wifi': 'WiFi / Web kontrollü',
    'category.wifi.short': 'WiFi',
    'category.ai': 'Kamera ve Yapay Zekâ',
    'category.ai.short': 'Yapay Zekâ',

    'difficulty.beginner': 'Başlangıç',
    'difficulty.intermediate': 'Orta',
    'difficulty.advanced': 'İleri',

    'project.number': 'Proje',
    'project.difficulty': 'Zorluk',
    'project.duration': 'Süre',
    'project.category': 'Kategori',
    'project.learn': 'Bu projede öğrenecekleriniz',
    'project.bom': 'Malzeme Listesi',
    'project.wiring': 'Bağlantı Şeması',
    'project.steps': 'Adım Adım Yapılışı',
    'project.code': 'Kodlar',
    'project.troubleshooting': 'Sorun Giderme',
    'project.bricks': 'Kullanılan Brickler',
    'project.next': 'Sonraki proje',
    'project.prev': 'Önceki proje',
    'project.backToList': 'Tüm projeler',
    'project.needsCamera': 'USB kamera gerekir',
    'project.needsMic': 'Mikrofon gerekir',
    'project.needsInternet': 'İnternet bağlantısı gerekir',
    'project.noExtraParts': 'Ek malzeme gerekmez',
    'project.step': 'Adım',
    'project.onThisPage': 'Bu sayfada',

    'bom.part': 'Malzeme',
    'bom.qty': 'Adet',
    'bom.notes': 'Not',
    'bom.alreadyOwned': 'Önceki projeden',

    'code.copy': 'Kopyala',
    'code.copied': 'Kopyalandı',
    'code.copyFailed': 'Kopyalanamadı',
    'code.file': 'Dosya',
    'code.untested': 'Bu kod henüz gerçek donanımda test edilmedi.',

    'callout.tip': 'İpucu',
    'callout.warning': 'Dikkat',
    'callout.danger': 'Tehlike',
    'callout.info': 'Bilgi',
    'callout.voltage': '3.3V Uyarısı',

    'photo.placeholder': 'Buraya kendi fotoğrafını ekleyebilirsin',
    'photo.hint': 'Dosyayı public/photos/ klasörüne koy',

    'guides.title': 'Rehberler',
    'guides.subtitle': 'Projelere başlamadan önce okunması gereken temel bilgiler.',
    'guide.readingTime': 'okuma süresi',
    'guide.backToList': 'Tüm rehberler',

    'parts.title': 'Malzemeler',
    'parts.subtitle':
      '10 projede kullanılan tüm malzemeler, 3.3V uyumluluk notlarıyla birlikte.',
    'parts.usedIn': 'Kullanıldığı projeler',
    'parts.category.core': 'Ana kart ve temel ekipman',
    'parts.category.passive': 'Pasif bileşenler',
    'parts.category.sensor': 'Sensörler',
    'parts.category.output': 'Çıkış birimleri',
    'parts.category.ai': 'Kamera ve ses',

    'footer.builtWith': 'Astro ile geliştirildi',
    'footer.disclaimer':
      'Bu site bağımsız bir eğitim kaynağıdır, Arduino ile resmi bir bağlantısı yoktur.',
    'footer.sources': 'Kaynaklar',

    'time.minutes': 'dakika',
    'common.readMore': 'Devamını oku',
    'common.optional': 'opsiyonel',
    'common.required': 'gerekli',
    'common.notFound': 'Sayfa bulunamadı',
    'common.notFoundText': 'Aradığın sayfa taşınmış veya hiç var olmamış olabilir.',
    'common.goHome': 'Ana sayfaya dön',
  },

  en: {
    'site.title': 'Arduino UNO Q Projects',
    'site.tagline': '10 hands-on projects, step by step',
    'site.description':
      '10 hands-on Arduino UNO Q projects: step-by-step instructions, wiring diagrams, parts lists and well-commented code. WiFi-connected and fully offline projects.',

    'nav.home': 'Home',
    'nav.projects': 'Projects',
    'nav.guides': 'Guides',
    'nav.parts': 'Parts',
    'nav.skipToContent': 'Skip to content',
    'nav.menu': 'Menu',
    'nav.close': 'Close',

    'theme.toggle': 'Toggle theme',
    'lang.switch': 'Switch language',
    'lang.label': 'Language',

    'home.hero.badge': 'Qualcomm Dragonwing + STM32 · Linux + Arduino',
    'home.hero.title': '10 Projects with the Arduino UNO Q',
    'home.hero.subtitle':
      'A Linux computer and an Arduino on one board. From your first blinking LED to WiFi-controlled and AI-powered builds — every step explained with diagrams and code.',
    'home.hero.cta': 'Start the first project',
    'home.hero.ctaSecondary': 'Read the guides first',

    'home.stats.projects': 'projects',
    'home.stats.offline': 'offline',
    'home.stats.wifi': 'WiFi enabled',
    'home.stats.languages': 'languages',

    'home.projects.title': 'Projects',
    'home.projects.subtitle': 'Ordered from easy to hard. We recommend following them in order.',
    'home.guides.title': 'Before You Start',
    'home.guides.subtitle': 'Get to know the board, set up the tools, learn the safety rules.',

    'filter.all': 'All',
    'filter.title': 'Filter',
    'filter.category': 'Category',
    'filter.difficulty': 'Difficulty',
    'filter.noResults': 'No projects match this filter.',
    'filter.showing': 'projects shown',

    'category.offline': 'No internet needed',
    'category.offline.short': 'Offline',
    'category.bridge': 'Bridge (MCU+MPU)',
    'category.bridge.short': 'Bridge',
    'category.wifi': 'WiFi / Web controlled',
    'category.wifi.short': 'WiFi',
    'category.ai': 'Camera and AI',
    'category.ai.short': 'AI',

    'difficulty.beginner': 'Beginner',
    'difficulty.intermediate': 'Intermediate',
    'difficulty.advanced': 'Advanced',

    'project.number': 'Project',
    'project.difficulty': 'Difficulty',
    'project.duration': 'Duration',
    'project.category': 'Category',
    'project.learn': 'What you will learn',
    'project.bom': 'Parts List',
    'project.wiring': 'Wiring Diagram',
    'project.steps': 'Step-by-Step Build',
    'project.code': 'Code',
    'project.troubleshooting': 'Troubleshooting',
    'project.bricks': 'Bricks used',
    'project.next': 'Next project',
    'project.prev': 'Previous project',
    'project.backToList': 'All projects',
    'project.needsCamera': 'USB camera required',
    'project.needsMic': 'Microphone required',
    'project.needsInternet': 'Internet connection required',
    'project.noExtraParts': 'No extra parts needed',
    'project.step': 'Step',
    'project.onThisPage': 'On this page',

    'bom.part': 'Part',
    'bom.qty': 'Qty',
    'bom.notes': 'Note',
    'bom.alreadyOwned': 'From a previous project',

    'code.copy': 'Copy',
    'code.copied': 'Copied',
    'code.copyFailed': 'Copy failed',
    'code.file': 'File',
    'code.untested': 'This code has not yet been tested on real hardware.',

    'callout.tip': 'Tip',
    'callout.warning': 'Warning',
    'callout.danger': 'Danger',
    'callout.info': 'Note',
    'callout.voltage': '3.3V Warning',

    'photo.placeholder': 'You can add your own photo here',
    'photo.hint': 'Drop the file into public/photos/',

    'guides.title': 'Guides',
    'guides.subtitle': 'The essentials to read before starting the projects.',
    'guide.readingTime': 'read',
    'guide.backToList': 'All guides',

    'parts.title': 'Materials',
    'parts.subtitle':
      'Every part used across the 10 projects, with its 3.3V compatibility notes.',
    'parts.usedIn': 'Used in projects',
    'parts.category.core': 'Board and basic equipment',
    'parts.category.passive': 'Passive components',
    'parts.category.sensor': 'Sensors',
    'parts.category.output': 'Output devices',
    'parts.category.ai': 'Camera and audio',

    'footer.builtWith': 'Built with Astro',
    'footer.disclaimer':
      'This is an independent educational resource and is not affiliated with Arduino.',
    'footer.sources': 'Sources',

    'time.minutes': 'minutes',
    'common.readMore': 'Read more',
    'common.optional': 'optional',
    'common.required': 'required',
    'common.notFound': 'Page not found',
    'common.notFoundText': 'The page you are looking for may have moved or never existed.',
    'common.goHome': 'Back to home',
  },
} as const;

/** Çeviri anahtarları / Translation keys. */
export type UIKey = keyof (typeof ui)['tr'];

// EN sözlüğünün TR ile birebir aynı anahtarlara sahip olduğunu derleme zamanında doğrular.
// Compile-time proof that EN carries exactly the same keys as TR.
const _enCompleteness: Record<UIKey, string> = ui.en;
void _enCompleteness;
