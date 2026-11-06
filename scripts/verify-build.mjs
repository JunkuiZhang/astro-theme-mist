import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = path.resolve(process.argv[2] || 'dist');
const base = `/${(process.env.BASE_PATH || '').replace(/^\/+|\/+$/g, '')}`.replace(/\/$/, '');
async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map(entry => entry.isDirectory() ? walk(path.join(directory, entry.name)) : path.join(directory, entry.name)))).flat();
}
const files = await walk(root);
const pages = files.filter(file => file.endsWith('.html'));
const errors = [];
let checked = 0;
for (const file of pages) {
  const html = await readFile(file, 'utf8');
  assert(html.includes('name="viewport"'), `缺少移动端 viewport：${file}`);
  assert(html.includes('<html lang="zh-CN"'), `缺少页面语言：${file}`);
  const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]));
  const references = [...html.matchAll(/\b(?:href|src)="([^"<>]+)"/g)].map(match => match[1]);
  for (const ref of references) {
    if (!ref || /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(ref)) continue;
    if (ref.startsWith('#')) {
      const id = decodeURIComponent(ref.slice(1));
      if (id && !ids.has(id)) errors.push(`${path.relative(root, file)}: 找不到锚点 ${ref}`);
      continue;
    }
    const clean = decodeURIComponent(ref.split(/[?#]/)[0]);
    if (!clean) continue;
    if (base && clean.startsWith('/') && clean !== base && !clean.startsWith(`${base}/`)) {
      errors.push(`${path.relative(root, file)}: 缺少部署子路径 ${ref}`);
      continue;
    }
    let target = clean.startsWith('/') ? path.join(root, clean.slice(base.length)) : path.resolve(path.dirname(file), clean);
    try {
      if ((await stat(target)).isDirectory()) target = path.join(target, 'index.html');
      await stat(target);
      checked++;
    } catch { errors.push(`${path.relative(root, file)}: 文件不存在 ${ref}`); }
  }
}
const search = JSON.parse(await readFile(path.join(root, 'search-index.json'), 'utf8'));
assert(search.length > 0, '搜索索引为空');
assert(search.every(post => post.url.startsWith(`${base}/posts/`)), '搜索结果路径与部署路径不一致');
for (const required of ['index.html', 'archives/index.html', 'tags/index.html', 'about/index.html', '404.html', 'rss.xml', 'sitemap-index.xml', 'robots.txt', 'pagefind/pagefind.js']) {
  await stat(path.join(root, required));
}
if (errors.length) {
  console.error([...new Set(errors)].join('\n'));
  process.exit(1);
}
console.log(`验证通过：${pages.length} 个页面、${checked} 条内部资源引用、${search.length} 篇可搜索文章。`);
