// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

/**
 * Site statique Astro, hébergé sur GitHub Pages avec le domaine personnalisé.
 * Les redirections reprennent les anciennes URLs Wix (voir docs/redirections.md).
 */
export default defineConfig({
  site: 'https://alexandradegans-kinesiologie.com',
  output: 'static',
  trailingSlash: 'never',
  build: { format: 'file', inlineStylesheets: 'auto' },
  integrations: [
    sitemap({
      filter: (page) =>
        !page.includes('/mentions-legales') && !page.includes('/confidentialite') && !page.includes('/404') && !page.includes('/reserv'),
      changefreq: 'monthly',
      priority: 0.7,
    }),
  ],
  redirects: {
    '/la-kinésiologie': '/kinesiologie',
    '/kinésiologie': '/memoires-transgenerationnelles',
    '/kinésiologieanimale': '/kinesiologie-animale',
    '/soinsénergétiques': '/soins-energetiques',
    '/drainage': '/drainage-lymphatique',
    '/about-1-1': '/drainage-lymphatique#jambes',
    '/avis': '/#temoignages',
    '/contact-3': '/contact',
  },
  vite: {
    build: { cssMinify: true },
  },
});
