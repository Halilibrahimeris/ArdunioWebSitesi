// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';
import tailwindcss from '@tailwindcss/vite';

// Deploy adresini burada değiştir / Change the deploy URL here
const SITE = 'https://example.com';

export default defineConfig({
  site: SITE,
  i18n: {
    locales: ['tr', 'en'],
    defaultLocale: 'tr',
    routing: {
      prefixDefaultLocale: true, // hem /tr/ hem /en/ açık olsun
    },
  },
  // Kök adres varsayılan dile gider / Root goes to the default language
  redirects: {
    '/': '/tr/',
  },
  integrations: [mdx(), sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
  markdown: {
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark' },
      wrap: false,
    },
  },
});
