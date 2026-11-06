import { getPosts, postUrl, excerpt, plainText } from '../lib/posts';
export async function GET() {
  const posts = (await getPosts()).map(post => ({ title: post.data.title, url: postUrl(post), excerpt: excerpt(post, 140), tags: post.data.tags, body: plainText(post.body || '') }));
  return new Response(JSON.stringify(posts), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
}
