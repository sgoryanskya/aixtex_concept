import type { APIRoute } from 'astro';
import { REVIEW_MODE, SITE_URL, BASE } from '../config';

/* Одна страница; ссылки с ?palette не попадают в карту и не индексируются */
export const GET: APIRoute = () => {
  const urls = !REVIEW_MODE && SITE_URL ? [`${SITE_URL}${BASE}`] : [];
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n')}\n</urlset>\n`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
