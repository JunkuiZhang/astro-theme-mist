import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { siteConfig } from '../config';
import { getPosts, postUrl, excerpt } from '../lib/posts';
export async function GET(context: APIContext) {
  return rss({ title: siteConfig.title, description: siteConfig.description, site: context.site!, items: (await getPosts()).map(post => ({ title: post.data.title, pubDate: post.data.published, description: excerpt(post), link: postUrl(post), categories: post.data.tags })), customData: '<language>zh-cn</language>' });
}
