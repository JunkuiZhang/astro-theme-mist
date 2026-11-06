# 雾白 · Mist

一套基于 Astro 的中文个人博客主题。樱粉与浅蓝配色、圆体标题、斜切插画卡片与轻量毛玻璃导航；桌面宽布局，手机单栏阅读。完全静态，可部署到 GitHub Pages。

仓库包含主题源码、原创 SVG 装饰和 3 篇演示文章。个人文章、头像、站点本地配置和审查报告由 `.gitignore` 排除，适合搭配独立的内容仓库使用。

## 本地运行

需要 Node.js 24。依赖版本和 `package-lock.json` 已锁定。

```sh
npm ci
npm run dev
```

也可以使用启动脚本；它会优先使用 PATH 中的 Node，或已准备好的用户缓存运行时：

```sh
./scripts/dev.sh
```

打开终端输出的地址（默认 http://localhost:4321）。生产预览包含真正的 Pagefind 索引：

```sh
npm run check
npm run build
npm run verify
npm run preview -- --host 0.0.0.0
```

开发模式搜索使用本地 JSON 索引；生产构建优先使用 Pagefind，加载失败时回退到 JSON。搜索结果只包含非草稿文章。

## 日常使用

- 站名、个人资料、头像、GitHub 链接：`site.config.mjs`；个人覆盖配置：`site.config.local.json`（不提交 Git）
- 页面、配色与断点：`src/styles/global.css`
- 卡片插画匹配与组合：`src/lib/post-art.ts`；SVG 图案：`src/components/PostArt.astro`
- 文章：`src/content/posts/`，支持普通 `.md` 和 `目录/index.md`；没有个人文章时，使用 `examples/posts/` 的演示文章
- 公共资源：`public/`；文章图片也可以放在文章同目录
- Markdown 扩展：`src/plugins/remark-callouts.mjs`

可在项目根目录新建 `site.config.local.json`，覆盖需要修改的字段：

```json
{
  "title": "我的博客",
  "author": "你的名字",
  "github": "https://github.com/your-name",
  "site": "https://your-name.github.io",
  "base": "/"
}
```

站点地址和部署路径也可以通过 `SITE_URL`、`BASE_PATH` 环境变量覆盖，环境变量优先。默认头像为仓库自带的 SVG，可把自己的头像放入 `public/images/` 并修改 `avatar` 字段。现有个人博客使用的 `public/images/avatar.jpg` 已被忽略。

创建文章：

```sh
npm run new-post -- my-first-post "我的第一篇文章"
```

新文章默认 `draft: true`，发布前改成 `false`。日期使用北京时间。已有同名文件不会被覆盖。

```yaml
---
title: 我的第一篇文章
published: 2026-11-06
updated: 2026-11-06 # 可选
description: 一段简短的介绍 # 可选；省略时从正文截取
tags: [Linux, C++]
category: 学习
draft: false
---
```

正式文章统一使用三个分类：`教程`（安装、部署、配置步骤）、`学习`（原理、算法、知识笔记和资源）、`随笔`（生活、感想和博客更新）。每篇优先保留 1–2 个标签，确有必要时最多 3 个，避免重复分类或罗列正文涉及的每个工具。

优先复用已有标签，并统一大小写。具体软件、版本仍可通过标题和正文搜索。草稿不会进入首页、归档、标签、搜索、RSS 或站点地图。

兼容原博客的主要字段，支持数学公式、语法高亮、提示块和 GitHub 仓库链接卡片。`image` 字段会保留，文章卡片使用按标题与标签匹配的本地 SVG 装饰插画，列表视图隐藏插画；正文中的图片照常显示。插画包含 18 种主题、8 组深浅配色、4 种底纹和斜切／圆弧／内嵌 3 种边框。构建时根据文章 ID 固定组合，同一篇文章在首页、筛选和标签页保持一致，无需外部图片服务。GitHub 卡片使用静态链接，不在访问时请求 GitHub API。

导入原博客的新增文章和图片：

```sh
npm run import-blog -- /path/to/content-repository
# 如需同步已有文章的修改，明确允许覆盖目标副本：
npm run import-blog -- /path/to/content-repository --overwrite
```

来源目录需要包含 `posts/`。导入只复制，不修改来源、不删除目标中独有的文章。请用内容仓库管理文章版本；本主题默认忽略 `src/content/posts/`。需要采用单仓库管理时，可移除这条忽略规则后提交自己的文章。

## 界面和布局

- 桌面：整体宽度为视口减 72px，无固定最大宽度，两侧各留 36px；1250px 以下各留 24px，手机各留 16px。左侧导航搭配双列文章；1650px 以上显示三列，2200px 以上按卡片最小 440px 自动增加列数。
- 点击桌面左上角的侧栏按钮，可收起为 64px 图标栏，把空间让给文章；悬停或键盘聚焦图标时显示名称。按钮随页头立即初始化，主脚本加载缓慢时头像和名称也不会移位。展开/收起状态跨页面、刷新后保留，手机抽屉导航独立显示完整文字。
- 1080px 以下：文章卡片改为单列。
- 760px 以下：单栏文章列表、抽屉导航，阅读控件适配触屏。
- 文章默认宽屏阅读，占满导航栏之外的可用空间；仍可切换到最大 1000px 的标准阅读，手动选择会保留。阅读宽度偏好使用 `mist-reading-mode`，不再读取旧版 `mist-reading-wide`，让旧的标准模式缓存不覆盖新默认值。偏好在首次绘制前恢复，避免刷新或进入文章时先窄后宽。
- 文章目录统一放在右下角的悬浮按钮中，默认收起，点击展开毛玻璃面板；不占正文宽度，支持当前章节高亮、内部滚动、点击跳转、Esc／外部点击收起。手机选择章节后自动收起。展开收起有短过渡，尊重减少动态效果；无 JavaScript 时仍可通过原生折叠控件浏览目录，无章节时隐藏入口。
- 深浅模式跟随系统，手动选择后保存在浏览器中。网格/列表视图也会记忆。
- 代码块使用等宽字体，桌面 15px、手机 14px，行高 1.75；行内代码接近正文字号，长代码在块内横向滚动。
- 首页滚动到列表底部约 200px 内时自动展开下一批 8 篇文章；新卡片进入视野时依次淡入并轻微上移。自动加载不移动焦点，仍保留手动加载按钮；系统开启“减少动态效果”时立即显示。无 JavaScript 时直接展示全部文章。
- 站内页面切换使用原生 View Transitions：普通页面淡入上移，进入文章轻微从右侧滑入，返回反向退出；文章进出过渡约 0.6 秒，顶部与侧栏保持稳定。返回原列表时保留已加载数量、分类、视图和浏览位置。直接打开文章时，“返回文章”回到首页；不支持跨页面过渡的浏览器使用简短入场动画，开启“减少动态效果”时关闭动效。
- 页面过渡的关键样式在 `src/components/PageMotion.astro` 中随页头输出；原生过渡和备用入场在首次绘制前二选一，不等主脚本、图片加载后重新隐藏正文或重播动画。
- 进入文章时，旧列表保持原位淡出；离开页面和鼠标点击都不会强制结束仍在播放的列表、卡片入场动画，避免旧画面在截图前跳到动画终点。键盘聚焦时仍会立即显示目标卡片。
- 支持键盘导航、搜索快捷键 Ctrl/⌘ K、减少动画偏好、代码复制和打印样式。

标题和导航使用随站点托管的 Mist Round，派生自 [寒蝉全圆体](https://github.com/Warren2060/ChillRound)，按 SIL OFL 1.1 分发（`public/fonts/OFL.txt`）。字体做了子集切分，常用界面文字优先加载，其他字符按需加载；正文与代码保留各自的阅读字体。生成文件已经包含在项目中，日常构建无需字体服务或 Python。重新生成字体可在安装 `fonttools`、`brotli` 后运行 `python scripts/subset-font.py /path/to/ChillRoundF.ttf`。

## GitHub Pages：从本仓库直接部署

已提供 `.github/workflows/deploy.yml`。默认在推送和 PR 时检查、构建，不自动部署。要发布演示站或个人博客：

1. GitHub → Settings → Pages → Source 选择 **GitHub Actions**。
2. 在 Actions 中手动运行 workflow 并勾选 `deploy`，即可部署一次。
3. 如需每次推送 `main` 都自动部署，添加仓库变量 `ENABLE_PAGES=true`。PR 只检查和构建，不部署。

工作流执行类型检查、静态构建、全文索引和内部链接验证；启用部署时再上传 Pages artifact 并发布。

默认自动识别：

- `用户名.github.io` 仓库：部署根路径 `/`。
- 普通项目仓库：部署 `/仓库名/`。

使用自定义域名时，在仓库 Settings → Secrets and variables → Actions → Variables 设置：

```text
SITE_URL = https://blog.example.com
BASE_PATH = /
```

同时在 Pages 中配置 Custom domain 和对应 DNS。域名只能由实际使用它的 Pages 站点接管，切换前请先确认新站已验证完成。

本地测试项目子路径：

```sh
SITE_URL=https://example.github.io BASE_PATH=/my_blog_theme npm run build
BASE_PATH=/my_blog_theme npm run verify
BASE_PATH=/my_blog_theme npm run preview
```

## 接入原来的跨仓库发布

也可以保留内容仓库已有的工作流，通过 `DEPLOY_KEY` 把生成文件发布到另一个 GitHub Pages 仓库：

1. 将原 CI 中“克隆 Fuwari + sed 修改配置”替换为检出本主题的固定 commit/tag。
2. 将内容仓库的 `posts/` 复制到主题 `src/content/posts/`，演示文章会自动停用；把站点配置复制为 `site.config.local.json`，并复制需要的头像资源。
3. 在主题目录执行 `npm ci`、`npm run check`、`npm run build`、`npm run verify`。
4. 保留原来的 CNAME 写入和 `peaceiris/actions-gh-pages` 部署步骤，将 `publish_dir` 指向主题的 `dist/`。

由内容仓库负责部署时，本主题仓库保持 `ENABLE_PAGES` 未设置即可。

## 验证范围

`npm run verify` 检查生成页面的内部链接、锚点、静态资源、子路径前缀、移动端 viewport、RSS、站点地图和搜索索引。外部网站链接和第三方视频服务的可用性由对应服务决定，不在该检查范围内。

旧文章沿用 `/posts/文件名/` 形式，文件名转小写、`index.md` 使用目录名。正式替换前仍应对照线上历史 URL；如果原站有自定义 slug 或不同大小写规则，需要补充对应重定向页面。
