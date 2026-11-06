import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

/** Shared defaults for a fresh theme checkout. */
const defaults = {
  title: '雾白 Mist',
  author: 'Mist',
  description: '柔和配色、轻量动效与宽屏阅读的 Astro 博客主题。',
  bio: '',
  github: 'https://github.com/JunkuiZhang/astro-theme-mist',
  avatar: 'images/avatar.svg',
  themeName: '雾白 Mist',
  site: 'https://example.com',
  base: '/',
};

// Keep the owner's local identity separate from the reusable theme source.
const localPath = path.resolve('site.config.local.json');
const local = existsSync(localPath) ? JSON.parse(readFileSync(localPath, 'utf8')) : {};
for (const key of Object.keys(defaults)) {
  if (key in local && typeof local[key] !== 'string') {
    throw new Error(`site.config.local.json: ${key} must be a string`);
  }
}
export const siteConfig = { ...defaults, ...local };
