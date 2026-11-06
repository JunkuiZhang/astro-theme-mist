import { cp, mkdir, readdir, stat } from 'node:fs/promises';
import path from 'node:path';

const source = process.argv[2];
if (!source) {
  console.error('用法：npm run import-blog -- /绝对路径/astro_blog [--overwrite]');
  process.exit(1);
}
const sourcePosts = path.resolve(source, 'posts');
const destination = path.resolve('src/content/posts');
if (!(await stat(sourcePosts)).isDirectory()) throw new Error('来源博客缺少 posts 文件夹');
if (sourcePosts === destination) throw new Error('来源和目标不能相同');
await mkdir(destination, { recursive: true });
const overwrite = process.argv.includes('--overwrite');
for (const entry of await readdir(sourcePosts)) {
  await cp(path.join(sourcePosts, entry), path.join(destination, entry), { recursive: true, force: overwrite, errorOnExist: false });
}
console.log(`文章和同目录资源已复制到 ${destination}。${overwrite ? '已覆盖同名文件。' : '保留已有同名文件。'}\n来源博客没有被修改。`);
