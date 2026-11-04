import type { APIRoute } from 'astro';
import { REVIEW_MODE, SITE_URL, BASE } from '../config';

/* Демо для согласования закрыто от индексации, публичная версия открыта и указывает sitemap */
export const GET: APIRoute = () => {
  const body = REVIEW_MODE
    ? 'User-agent: *\nDisallow: /\n'
    : `User-agent: *\nAllow: /\n${SITE_URL ? `Sitemap: ${SITE_URL}${BASE}sitemap.xml\n` : ''}`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
