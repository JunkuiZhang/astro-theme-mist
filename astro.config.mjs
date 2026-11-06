import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { unified } from '@astrojs/markdown-remark';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkDirective from 'remark-directive';
import { remarkCallouts } from './src/plugins/remark-callouts.mjs';
import { siteConfig } from './site.config.mjs';

export default defineConfig({
  site: process.env.SITE_URL || siteConfig.site,
  base: process.env.BASE_PATH || siteConfig.base,
  output: 'static',
  trailingSlash: 'always',
  integrations: [sitemap()],
  markdown: {
    processor: unified({
      remarkPlugins: [remarkMath, remarkDirective, remarkCallouts],
      rehypePlugins: [[rehypeKatex, { strict: false }]],
    }),
    shikiConfig: { themes: { light: 'github-light', dark: 'github-dark' }, langAlias: { conf: 'ini' } },
  },
  server: { host: '0.0.0.0' },
  devToolbar: { enabled: false },
});
