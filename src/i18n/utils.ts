import { ui, defaultLang, locales, type Lang, type UIKey } from './ui';

/** URL'den aktif dili çıkarır / Extracts the active language from a URL. */
export function getLangFromUrl(url: URL): Lang {
  const [, maybeLang] = url.pathname.split('/');
  if (locales.includes(maybeLang as Lang)) return maybeLang as Lang;
  return defaultLang;
}

/**
 * Bir dil için çeviri fonksiyonu döndürür.
 * Returns a translation function bound to a language.
 */
export function useTranslations(lang: Lang) {
  return function t(key: UIKey): string {
    return ui[lang][key] ?? ui[defaultLang][key];
  };
}

/**
 * Dile göre yol üretir: path('tr', 'projects', 'trafik-lambasi') -> '/tr/projects/trafik-lambasi'
 * Builds a language-prefixed path.
 */
export function path(lang: Lang, ...segments: (string | number)[]): string {
  const clean = segments
    .map((s) => String(s).replace(/^\/+|\/+$/g, ''))
    .filter(Boolean);
  return '/' + [lang, ...clean].join('/');
}

/** Sayı biçimlendirme / Locale-aware number formatting. */
export function formatNumber(lang: Lang, value: number): string {
  return new Intl.NumberFormat(lang === 'tr' ? 'tr-TR' : 'en-US').format(value);
}

/** HTML lang özniteliği için tam yerel kod / Full locale code for the html lang attribute. */
export function htmlLang(lang: Lang): string {
  return lang === 'tr' ? 'tr-TR' : 'en-US';
}

export { defaultLang, locales };
export type { Lang, UIKey };
