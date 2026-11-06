---
title: 开始使用雾白 Mist
published: 2026-11-07
description: 配置站点、导入文章，并在本地预览你的博客。
category: 教程
tags: [Astro]
---

## 本地预览

安装 Node.js 24，在项目目录执行：

```sh
npm ci
npm run dev
```

## 站点资料

默认资料在 `site.config.mjs` 中。你也可以新建 `site.config.local.json`，只覆盖自己的配置：

```json
{
  "title": "我的博客",
  "author": "你的名字",
  "site": "https://example.com"
}
```

## 写第一篇文章

```sh
npm run new-post -- first-post "第一篇文章"
```

文章会放在 `src/content/posts/`。写好后将 `draft` 改为 `false`。一旦这个目录中有 Markdown 文章，主题会使用你的文章，演示文章便不再加载。

:::tip
分类用来区分教程、学习和随笔，标签用来连接相同主题的文章。每篇保留少量标签就够了。
:::

## 构建

```sh
npm run check
npm run build
npm run verify
```

生成的 `dist/` 是静态网站，可以交给 GitHub Pages 发布。部署方式见仓库 README。
