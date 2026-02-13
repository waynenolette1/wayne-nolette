import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import remarkBasePath from './remark-base-path.mjs';
import rehypeTableWrapper from './rehype-table-wrapper.mjs';
import { BASE_PATH, SITE_URL } from './site.config.mjs';

export default defineConfig({
  site: SITE_URL,
  base: BASE_PATH,
  integrations: [mdx(), sitemap()],
  output: 'static',
  prefetch: {
    // Use 'hover' strategy - only prefetch when user hovers/taps a link
    // This is much lighter on mobile than 'viewport' which prefetches all visible links
    prefetchAll: false,
    defaultStrategy: 'hover',
  },
  markdown: {
    remarkPlugins: [remarkBasePath],
    rehypePlugins: [rehypeTableWrapper],
    shikiConfig: {
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
      defaultColor: false,
    },
  },
  vite: {
    build: {
      rollupOptions: {
        onwarn(warning, warn) {
          // Suppress unused import warnings from Astro internals
          if (
            warning.code === 'UNUSED_EXTERNAL_IMPORT' &&
            warning.exporter?.includes('@astrojs/internal-helpers')
          ) {
            return;
          }
          warn(warning);
        },
      },
    },
  },
});
