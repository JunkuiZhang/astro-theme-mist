import { getCollection, type CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'posts'>;
export const url = (path = '') => `${import.meta.env.BASE_URL.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
export const postUrl = (post: Post) => url(`posts/${post.id}/`);
export const tagUrl = (tag: string) => url(`tags/${encodeURIComponent(tag)}/`);
export async function getPosts() {
  return (await getCollection('posts', ({ data }) => !data.draft))
    .sort((a, b) => b.data.published.getTime() - a.data.published.getTime() || a.id.localeCompare(b.id));
}
export function plainText(body: string) {
  return body.replace(/```[\s\S]*?```/g, ' ').replace(/<!--[^]*?-->/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, '').replace(/^[#>|:\s-]+/gm, '').replace(/[*_`$]/g, '').replace(/\s+/g, ' ').trim();
}
export function excerpt(post: Post, length = 110) {
  const text = post.data.description || plainText(post.body || '');
  return text.length > length ? `${text.slice(0, length).trim()}…` : text;
}
export function readingTime(post: Post) {
  const body = post.body || '';
  const cjk = (body.match(/[\u3400-\u9fff]/g) || []).length;
  const words = body.replace(/[\u3400-\u9fff]/g, ' ').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(cjk / 350 + words / 220));
}
export function dateLabel(date: Date) {
  return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'UTC' }).format(date).replaceAll('/', '.');
}
export function tagsWithCount(posts: Post[]) {
  const counts = new Map<string, number>();
  posts.forEach(post => post.data.tags.forEach(tag => counts.set(tag, (counts.get(tag) || 0) + 1)));
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}
