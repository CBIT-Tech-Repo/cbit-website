// After `astro build`: one robots setting for every page (Astro's and the imported v4 pages),
// plus robots.txt and sitemap.xml. PUBLIC_NOINDEX=false only on launch day; until then nothing is indexed.
// GitHub Pages cannot send response headers, so the robots meta tag is what keeps pages out of search.
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = fileURLToPath(new URL('../dist/', import.meta.url));
const SITE = (process.env.PUBLIC_SITE_URL || 'https://www.cbitx.com').replace(/\/$/, '');
const NOINDEX = process.env.PUBLIC_NOINDEX !== 'false';
const META = '<meta name="robots" content="noindex, nofollow">';

const pages = [];
(function walk(d) {
  for (const n of readdirSync(d)) {
    const p = join(d, n);
    if (statSync(p).isDirectory()) walk(p);
    else if (n.endsWith('.html')) pages.push(p);
  }
})(DIST);

for (const file of pages) {
  let h = readFileSync(file, 'utf8').replace(/\s*<meta name="robots"[^>]*>/gi, '');
  if (NOINDEX) h = h.replace(/(<meta charset="[^"]*">)/i, `$1\n${META}`);
  writeFileSync(file, h, 'utf8');
}

const urls = pages
  .map((f) => '/' + relative(DIST, f).split(sep).join('/'))
  .filter((u) => u.endsWith('/index.html'))
  .map((u) => SITE + u.slice(0, -'index.html'.length))
  .sort();
writeFileSync(join(DIST, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n')}\n</urlset>\n`, 'utf8');
writeFileSync(join(DIST, 'robots.txt'), NOINDEX ? 'User-agent: *\nDisallow: /\n' : `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`, 'utf8');
console.log(`postbuild: robots ${NOINDEX ? 'noindex' : 'index'} on ${pages.length} page(s); sitemap with ${urls.length} address(es).`);
