import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';
import { existsSync, readdirSync } from 'node:fs';

// Real posts live outside the theme's Git history. Fresh clones show the demos.
const localPosts = './src/content/posts';
const hasLocalPosts = existsSync(localPosts)
  && readdirSync(localPosts, { recursive: true }).some(entry => String(entry).endsWith('.md'));

const posts = defineCollection({
  loader: glob({
    pattern: '**/*.md',
    base: hasLocalPosts ? localPosts : './examples/posts',
    // Fuwari uses directory names for index.md and lower-case post slugs.
    generateId: ({ entry }) => entry.replace(/\.md$/i, '').replace(/\/index$/i, '').toLowerCase(),
  }),
  schema: z.object({
    title: z.string(),
    published: z.coerce.date(),
    updated: z.coerce.date().optional(),
    description: z.string().optional(),
    image: z.string().optional(),
    tags: z.array(z.string()).default([]),
    category: z.string().default('随笔'),
    draft: z.boolean().default(false),
    lang: z.string().optional(),
  }),
});

export const collections = { posts };
