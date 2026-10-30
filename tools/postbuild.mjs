// After `astro build`, for every page (Astro's and the imported v4 pages):
//   - one robots setting (noindex until launch day: PUBLIC_NOINDEX=false only then);
//   - a canonical address, Open Graph and Twitter tags, so shared links and AI tools read the page correctly;
//   - on the home page, a machine-readable description of CBIT (schema.org JSON-LD);
//   - visitor statistics (Cloudflare Web Analytics, no cookies) only when PUBLIC_CF_ANALYTICS_TOKEN is set,
//     and Google Search Console's ownership tag on the home page only when PUBLIC_GOOGLE_SITE_VERIFICATION is set;
// and writes robots.txt, sitemap.xml, llms.txt (a guide for AI tools) and llms-full.txt (every page as text).
// Everything is derived from the built pages, so it can only contain what the pages already publish.
// GitHub Pages cannot send response headers, so meta tags and robots.txt do this work.
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = fileURLToPath(new URL('../dist/', import.meta.url));
const SITE = (process.env.PUBLIC_SITE_URL || 'https://www.cbitx.com').replace(/\/$/, '');
const NOINDEX = process.env.PUBLIC_NOINDEX !== 'false';
// Both are public values (they appear in the page source), kept as repository variables, not secrets.
const CF_TOKEN = (process.env.PUBLIC_CF_ANALYTICS_TOKEN || '').trim();
const GSC_TOKEN = (process.env.PUBLIC_GOOGLE_SITE_VERIFICATION || '').trim();
if (CF_TOKEN && !/^[0-9a-f]{32}$/.test(CF_TOKEN)) throw new Error('PUBLIC_CF_ANALYTICS_TOKEN must be the 32-character token from the Cloudflare snippet, not the whole snippet.');
if (GSC_TOKEN && !/^[A-Za-z0-9_-]{20,100}$/.test(GSC_TOKEN)) throw new Error('PUBLIC_GOOGLE_SITE_VERIFICATION must be only the content="..." value from Google\'s meta tag.');
const SITE_NAME = 'CBIT Venture Builder';
const SHARE_IMAGE = '/assets/img/logos/cbit-blend.png';

const pages = [];
(function walk(d) {
  for (const n of readdirSync(d)) {
    const p = join(d, n);
    if (statSync(p).isDirectory()) walk(p);
    else if (n.endsWith('.html')) pages.push(p);
  }
})(DIST);

const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const decode = (s) => s
  .replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'")
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&rsquo;/g, '’').replace(/&lsquo;/g, '‘')
  .replace(/&ldquo;/g, '“').replace(/&rdquo;/g, '”').replace(/&ndash;/g, '–').replace(/&mdash;/g, '—')
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
const pathOf = (file) => {
  const rel = '/' + relative(DIST, file).split(sep).join('/');
  return rel.endsWith('/index.html') ? rel.slice(0, -'index.html'.length) : rel;
};

/** The page's main content as plain text with Markdown headings and list items, for llms-full.txt. */
function mainText(h) {
  const m = /<main\b[^>]*>([\s\S]*?)<\/main>/i.exec(h);
  let s = (m ? m[1] : '')
    .replace(/<(script|style|svg|noscript|template)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<nav\b[^>]*aria-label="(On this page|Breadcrumb)"[^>]*>[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<img\b[^>]*\balt="([^"]+)"[^>]*>/gi, (_, alt) => ` [Image: ${alt}] `)
    .replace(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi, (_, n, t) => `\n\n${'#'.repeat(Math.min(6, Number(n) + 1))} ${t.replace(/<[^>]+>/g, '').trim()}\n\n`)
    .replace(/<li\b[^>]*>/gi, '\n- ')
    .replace(/<\/(p|div|section|article|ul|ol|dl|dd|dt|figure|figcaption|tr|blockquote)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ');
  s = decode(s).replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n');
  return s.trim();
}

const info = [];
let socials = [];
for (const file of pages) {
  const path = pathOf(file);
  const isNotFound = path === '/404.html';
  let h = readFileSync(file, 'utf8');

  // Robots: one setting everywhere.
  h = h.replace(/\s*<meta name="robots"[^>]*>/gi, '');
  if (NOINDEX || isNotFound) h = h.replace(/(<meta charset="[^"]*">)/i, '$1\n<meta name="robots" content="noindex, nofollow">');

  const title = decode((/<title>([\s\S]*?)<\/title>/i.exec(h) || [])[1] || SITE_NAME).trim();
  const description = decode((/<meta name="description" content="([^"]*)"/i.exec(h) || [])[1] || '').trim();
  const url = SITE + path;

  // Canonical, Open Graph and Twitter tags (replacing any the page already has).
  h = h.replace(/\s*<link rel="canonical"[^>]*>/gi, '').replace(/\s*<meta (property="og:|name="twitter:)[^>]*>/gi, '');
  const tags = [
    isNotFound ? '' : `<link rel="canonical" href="${esc(url)}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="${SITE_NAME}">`,
    `<meta property="og:title" content="${esc(title)}">`,
    description && `<meta property="og:description" content="${esc(description)}">`,
    isNotFound ? '' : `<meta property="og:url" content="${esc(url)}">`,
    `<meta property="og:image" content="${SITE}${SHARE_IMAGE}">`,
    `<meta property="og:locale" content="en_GB">`,
    `<meta name="twitter:card" content="summary">`,
  ].filter(Boolean).join('\n');
  h = h.replace(/<\/head>/i, `${tags}\n</head>`);

  // Visitor statistics: Cloudflare's beacon, deferred, on every page (the privacy page says so when it is on).
  h = h.replace(/\s*<script[^>]*static\.cloudflareinsights\.com[^>]*><\/script>/gi, '');
  if (CF_TOKEN) h = h.replace(/<\/body>/i, `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "${CF_TOKEN}"}'></script>\n</body>`);

  if (path === '/') {
    h = h.replace(/\s*<meta name="google-site-verification"[^>]*>/gi, '');
    if (GSC_TOKEN) h = h.replace(/<\/head>/i, `<meta name="google-site-verification" content="${GSC_TOKEN}">\n</head>`);
    socials = [...new Set([...h.matchAll(/href="(https:\/\/(?:www\.)?(?:linkedin\.com|instagram\.com|youtube\.com|x\.com|medium\.com)\/[^"]+)"/g)].map((m) => m[1]))];
    const org = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Organization',
          '@id': `${SITE}/#organization`,
          name: 'CBIT – Centre for Business and Industry Transformation',
          alternateName: ['CBIT', SITE_NAME],
          url: `${SITE}/`,
          logo: `${SITE}${SHARE_IMAGE}`,
          email: 'cbit@ntu.ac.uk',
          description: description || undefined,
          parentOrganization: { '@type': 'CollegeOrUniversity', name: 'Nottingham Trent University', url: 'https://www.ntu.ac.uk/' },
          sameAs: socials,
          contactPoint: [
            { '@type': 'ContactPoint', contactType: 'general enquiries', email: 'cbit@ntu.ac.uk' },
            { '@type': 'ContactPoint', contactType: 'founders and the CBIT Venture Builder', email: 'cbit.vb@ntu.ac.uk' },
            { '@type': 'ContactPoint', contactType: 'executive education', email: 'cbit.edu@ntu.ac.uk' },
          ],
        },
        { '@type': 'WebSite', '@id': `${SITE}/#website`, name: SITE_NAME, url: `${SITE}/`, inLanguage: 'en-GB', publisher: { '@id': `${SITE}/#organization` } },
      ],
    };
    h = h.replace(/\s*<script type="application\/ld\+json">[\s\S]*?<\/script>/gi, '')
      .replace(/<\/head>/i, `<script type="application/ld+json">${JSON.stringify(org)}</script>\n</head>`);
  }

  writeFileSync(file, h, 'utf8');
  if (!isNotFound) info.push({ path, url, title: title.replace(/ \| CBIT Venture Builder$/, ''), description, text: mainText(h) });
}
info.sort((a, b) => a.path.localeCompare(b.path));

// sitemap.xml and robots.txt
writeFileSync(join(DIST, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${info.map((p) => `  <url><loc>${p.url}</loc></url>`).join('\n')}\n</urlset>\n`, 'utf8');
writeFileSync(join(DIST, 'robots.txt'), NOINDEX ? 'User-agent: *\nDisallow: /\n' : `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`, 'utf8');

// llms.txt (https://llmstxt.org): a short guide to the site for AI tools, grouped by section.
const SECTIONS = [
  ['Start here', (p) => p === '/' || p === '/work-with-us/' || p === '/services/'],
  ['Who we work with', (p) => /^\/(founders|business-leaders|research-leaders|government-leaders)\/$/.test(p)],
  ['Services', (p) => p.startsWith('/services/') && p !== '/services/'],
  ['Help me choose', (p) => p.startsWith('/help-me-choose/')],
  ['Impact and track record', (p) => p.startsWith('/impact/') || p === '/keynotes/' || p === '/sources/'],
  ['News and events', (p) => p.startsWith('/news-and-events/')],
  ['About CBIT', (p) => p.startsWith('/about/') || p === '/contact/'],
  ['Policies', (p) => p === '/accessibility/' || p === '/privacy/'],
];
const home = info.find((p) => p.path === '/');
let llms = `# ${SITE_NAME}\n\n> ${home?.description || 'CBIT Venture Builder, part of CBIT, Nottingham Business School, Nottingham Trent University.'}\n\n`;
llms += 'CBIT (Centre for Business and Industry Transformation) is part of Nottingham Business School, Nottingham Trent University. '
  + 'Every figure on this site is listed with its source on the Figures and sources page. '
  + `Enquiries: cbit@ntu.ac.uk (general), cbit.vb@ntu.ac.uk (founders and the CBIT Venture Builder), cbit.edu@ntu.ac.uk (executive education). `
  + `The full text of every page is in ${SITE}/llms-full.txt.\n`;
const used = new Set();
for (const [name, test] of SECTIONS) {
  const list = info.filter((p) => !used.has(p.path) && test(p.path));
  if (!list.length) continue;
  list.forEach((p) => used.add(p.path));
  llms += `\n## ${name}\n\n` + list.map((p) => `- [${p.title}](${p.url})${p.description ? `: ${p.description}` : ''}`).join('\n') + '\n';
}
const rest = info.filter((p) => !used.has(p.path));
if (rest.length) llms += `\n## Optional\n\n` + rest.map((p) => `- [${p.title}](${p.url})${p.description ? `: ${p.description}` : ''}`).join('\n') + '\n';
writeFileSync(join(DIST, 'llms.txt'), llms, 'utf8');

// llms-full.txt: every page's main content as plain text.
const full = `# ${SITE_NAME}: full text of the website\n\nSource: ${SITE}/ . One section per page.\n\n`
  + info.map((p) => `---\n\n# ${p.title}\n\nURL: ${p.url}\n${p.description ? `Summary: ${p.description}\n` : ''}\n${p.text}\n`).join('\n');
writeFileSync(join(DIST, 'llms-full.txt'), full, 'utf8');

console.log(`postbuild: robots ${NOINDEX ? 'noindex' : 'index'}, statistics ${CF_TOKEN ? 'on' : 'off'}, Search Console tag ${GSC_TOKEN ? 'on' : 'off'}, and sharing tags on ${pages.length} page(s); sitemap, llms.txt and llms-full.txt with ${info.length} page(s); ${socials.length} social profile(s) in the CBIT description.`);
