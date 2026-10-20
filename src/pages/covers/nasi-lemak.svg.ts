// Built once as /covers/nasi-lemak.svg and shared by every page that shows the cover.
import type { APIRoute } from 'astro';
import { nasiLemakSvg } from '../../lib/nasiLemak';

export const GET: APIRoute = () =>
  new Response(nasiLemakSvg(), { headers: { 'Content-Type': 'image/svg+xml' } });
