// Blog posts are Markdown files in src/content/blog/. Each file becomes a page
// at /blog/<file name>/.
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    // Written as it should appear, e.g. "3 March 2027". Used for display only.
    date: z.string(),
    // ISO date (2027-03-03) used to put the newest post first.
    published: z.string(),
    category: z.string(),
    summary: z.string(),
    // true keeps a post out of the built site (it still shows in `npm run dev`). The sample post is a draft.
    draft: z.boolean().default(false),
    // Every number in a post is traced to its source. Listed at the end.
    sources: z.array(z.string()).default([]),
  }),
});

export const collections = { blog };
