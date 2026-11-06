import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const slug = process.argv[2];
const title = process.argv[3] || slug;
if (!slug || !/^[a-z0-9]+(?:[-_][a-z0-9]+)*$/.test(slug)) {
  console.error('用法：npm run new-post -- my-post "文章标题"（文件名请使用小写字母、数字、短横线或下划线）');
  process.exit(1);
}
const date = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Shanghai' }).format(new Date());
const file = path.resolve('src/content/posts', `${slug}.md`);
await mkdir(path.dirname(file), { recursive: true });
try {
  await writeFile(file, `---\ntitle: ${JSON.stringify(title)}\npublished: ${date}\ndescription: ''\ntags: []\ncategory: 随笔\ndraft: true\n---\n\n从这里开始记录。\n`, { flag: 'wx' });
  console.log(`已创建草稿：${file}\n发布前将 draft 改为 false。`);
} catch (error) {
  if (error.code === 'EEXIST') console.error(`文件已存在，未覆盖：${file}`);
  else console.error(error);
  process.exit(1);
}
