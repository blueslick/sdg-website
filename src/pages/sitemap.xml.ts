// The sitemap, built from the `site` setting in astro.config.mjs. It lists only pages
// search engines should index: not Verify, the sample post, or /register/ before entries open.
import type { APIRoute } from 'astro';
import { getPosts } from '../lib/blog';
import { REGISTRATION_OPEN, PREVIEW_REGISTRATION_OPEN } from '../site';

export const GET: APIRoute = async ({ site }) => {
  const paths = ['/', '/competition/', '/about/', '/blog/', '/contact/', '/privacy/'];
  if (REGISTRATION_OPEN) paths.push('/register/');
  const posts = await getPosts();
  for (const post of posts) {
    if (post.id !== 'sample-post') paths.push(`/blog/${post.id}/`);
  }
  // The entries-open pull-request preview is noindex on every page, so it lists nothing.
  const urls = PREVIEW_REGISTRATION_OPEN ? [] : paths.map((path) => new URL(path, site).href);
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((url) => `  <url><loc>${url}</loc></url>`).join('\n')}
</urlset>
`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
