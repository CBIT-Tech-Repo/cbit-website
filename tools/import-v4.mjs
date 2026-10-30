// Import the approved v4 design into this site as static pages, for every page not yet rebuilt in Astro.
//
// It reads the mockup sources in CBIT's OneDrive (so it runs on a computer with OneDrive), and writes only
// cleared, public content into public/: the production build of the mockups, with
//   - every story or placeholder not marked "ready" taken off its page (the production guard's own remedy);
//   - every item flagged needs-confirmation dropped (by the production build itself);
//   - review notes, publication flags, the review toolbar, HTML comments and style comments removed;
//   - links rewritten to clean addresses, and links to removed stories taken out.
// The OneDrive sources are never changed. Pages built in Astro (src/pages/) are not overwritten.
//
// Usage:  node tools/import-v4.mjs --site "<OneDrive>/Documents - CBIT/collaterals/Web/Site"
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = join(ROOT, 'public');
const MANIFEST = join(PUBLIC, '.v4-import.json');
const arg = (name) => { const i = process.argv.indexOf(name); return i > -1 ? process.argv[i + 1] : undefined; };
const SITE = arg('--site');
if (!SITE || !existsSync(join(SITE, '.project', 'mockup-src.v4'))) {
  console.error('usage: node tools/import-v4.mjs --site "<OneDrive>/.../collaterals/Web/Site"');
  process.exit(2);
}
const PREFIX = '2026.09.30.site.';

/** Mockup page key -> clean address. Every production page must be listed. */
const MAP = {
  'home': '/', 'work.with.us': '/work-with-us/', 'services': '/services/',
  'founders': '/founders/', 'business.leaders': '/business-leaders/', 'research.leaders': '/research-leaders/', 'government.leaders': '/government-leaders/',
  'service.venture.builder': '/services/cbit-venture-builder/', 'service.steam.founder': '/services/steam-founder/',
  'service.global.vb': '/services/global-vb-partnership/', 'service.executive.programmes': '/services/executive-programmes/',
  'service.funded.projects': '/services/funded-ai-projects/', 'service.steam.xcelerate': '/services/steam-xcelerate/',
  'service.venture.partner': '/services/venture-partner/', 'service.ecosystem.building': '/services/innovation-ecosystem-building/',
  'service.sister.centres': '/services/sister-centres/',
  'path.venture.start': '/help-me-choose/founders/', 'path.venture.q2': '/help-me-choose/founders/q2/', 'path.venture.q3': '/help-me-choose/founders/q3/',
  'path.venture.o.not.sure': '/help-me-choose/founders/not-sure/', 'path.venture.o.outside.uk': '/help-me-choose/founders/outside-uk/',
  'path.leaders.start': '/help-me-choose/business-leaders/', 'path.leaders.o.not.sure': '/help-me-choose/business-leaders/not-sure/',
  'path.research.start': '/help-me-choose/research/', 'path.research.q2': '/help-me-choose/research/q2/',
  'path.research.o.not.sure': '/help-me-choose/research/not-sure/', 'path.research.o.executive.phd': '/help-me-choose/research/executive-phd/',
  'path.partner.start': '/help-me-choose/government/', 'path.partner.o.not.sure': '/help-me-choose/government/not-sure/',
  'case.studies': '/impact/case-studies/',
  'impact.ventures': '/impact/ventures/', 'impact.research.projects': '/impact/research-projects/', 'project.beeftwin': '/impact/research-projects/beeftwin/',
  'impact.publications': '/impact/publications/', 'impact.stories': '/impact/stories/', 'keynotes': '/keynotes/',
  'news.events': '/news-and-events/', 'about.how.we.work': '/about/how-we-work/', 'about.people': '/about/team-and-partners/',
  'about.ai': '/about/ai-at-cbit/', 'platforms': '/about/platforms/', 'contact': '/contact/', 'sources': '/sources/',
  'accessibility': '/accessibility/', 'privacy': '/privacy/',
};
/** Pages Astro builds itself: the import never writes these. News and events is edited in Pages CMS;
 *  the accessibility statement and privacy notice are the live versions, not the mockups' drafts. */
const ASTRO_OWNED = new Set(['news.events', 'accessibility', 'privacy']);

/** Search and sharing descriptions replaced on the live site, using only wording the pages already publish:
 *  the home page's mockup description describes the design. */
const DESCRIPTIONS = {
  home: 'Making people and ventures AI-native. CBIT, part of Nottingham Business School at Nottingham Trent University, helps founders, business leaders, research leaders and governments build ventures, develop people, and turn research into ventures and impact.',
};
/** The bar and footer of the Astro-built pages (src/partials/) are copied from this imported page on every import,
 *  so a menu change in the v4 design reaches every page. */
const PARTIALS_FROM = 'news.events';

// 1. Copy the sources and take unready stories and placeholders off their pages.
const work = mkdtempSync(join(tmpdir(), 'cbit-import-'));
const src = join(work, 'src');
const out = join(work, 'out');
cpSync(join(SITE, '.project', 'mockup-src.v4'), src, { recursive: true });
const NOT_READY = /\sdata-publish="(needs-approval|hold|placeholder)"/;
function cutElement(html, start) {
  const tag = /^<([a-z0-9]+)\b/i.exec(html.slice(start))[1];
  const re = new RegExp(`<(/?)${tag}\\b[^>]*>`, 'gi');
  re.lastIndex = start;
  let depth = 0, m;
  while ((m = re.exec(html))) {
    depth += m[1] === '/' ? -1 : (m[0].endsWith('/>') ? 0 : 1);
    if (depth === 0) return { html: html.slice(0, start) + html.slice(re.lastIndex), cut: html.slice(start, re.lastIndex) };
  }
  throw new Error(`unbalanced <${tag}>`);
}
const takenOff = [];
for (const name of readdirSync(join(src, 'pages')).filter((n) => n.endsWith('.html'))) {
  const file = join(src, 'pages', name);
  let html = readFileSync(file, 'utf8'), changed = false;
  for (;;) {
    const re = /<(article|div|section|li|figure|aside|p)\b[^>]*>/gi;
    let m, at = -1, open = '';
    while ((m = re.exec(html))) if (NOT_READY.test(m[0])) { at = m.index; open = m[0]; break; }
    if (at < 0) break;
    const r = cutElement(html, at);
    html = r.html; changed = true;
    const title = (/<h[2-4][^>]*>([\s\S]*?)<\/h[2-4]>/i.exec(r.cut) || [])[1] || '';
    takenOff.push(`${name}: ${NOT_READY.exec(open)[1]} ${(/\sid="([^"]+)"/.exec(open) || [])[1] || ''} ${title.replace(/<[^>]+>/g, '').trim()}`.trim());
  }
  if (changed) writeFileSync(file, html.replace(/<li>\s*<\/li>\s*/g, ''), 'utf8');
}

// 2. The mockups' own production build: drops flagged items, strips notes and flags, or fails.
const build = spawnSync(process.execPath, [join(SITE, '.project', 'tools', 'build-mockups.v4.mjs'), '--production', '--src', src, '--out', out], { cwd: SITE, encoding: 'utf8' });
if (build.status !== 0) {
  console.error(build.stdout + build.stderr);
  console.error('import-v4: the production build failed; nothing was written.');
  process.exit(1);
}
const dropped = (/dropped from production[\s\S]*?\):\s*(\d+)/i.exec(build.stdout) || [])[1] || '?';

// 3. Anchors on each built page, so links to removed stories can be taken out.
const pages = readdirSync(out).filter((n) => n.startsWith(PREFIX) && n.endsWith('.html'));
const keyOf = (file) => file.slice(PREFIX.length, -'.html'.length);
const html = Object.fromEntries(pages.map((p) => [keyOf(p), readFileSync(join(out, p), 'utf8')]));
// Groups left empty by the removals: a story group with no stories goes; a "More stories" box with no
// links keeps only its "All impact stories" link. Done before anchors are read, so links to them go too.
let emptyGroups = 0;
for (const k of Object.keys(html)) {
  let h = html[k];
  h = h.replace(/<div class="story-links">\s*<h3[^>]*>[\s\S]*?<\/h3>\s*<ul[^>]*>\s*<\/ul>\s*(<p class="section__foot">[\s\S]*?<\/p>)?\s*<\/div>/g, (_, foot) => { emptyGroups++; return foot || ''; });
  for (;;) {
    const at = h.search(/<ul class="story-list">\s*<\/ul>/);
    if (at < 0) break;
    const start = h.lastIndexOf('<section', at);
    const r = cutElement(h, start);
    if (!r.cut.includes('class="story-list"')) throw new Error(`import-v4: empty story list in ${k} is not inside a section`);
    h = r.html; emptyGroups++;
  }
  html[k] = h;
}
const anchors = Object.fromEntries(Object.entries(html).map(([k, h]) => [k, new Set([...h.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]))]));
for (const k of Object.keys(html)) if (!(k in MAP)) throw new Error(`import-v4: no clean address for ${k}; add it to MAP`);

const linkRe = /href="2026\.09\.30\.site\.([a-z0-9.]+)\.html(?:#([^"]*))?"/;
const isDangling = (k, frag) => frag && !ASTRO_OWNED.has(k) && !(anchors[k] && anchors[k].has(frag));
let danglingRemoved = 0;

function clean(key, page) {
  let h = page;
  // Mockup-only review script in <head>: keep only the no-js -> js switch.
  h = h.replace(/<script>\s*\/\*[^*]*review-notes[\s\S]*?<\/script>/i, "<script>document.documentElement.className=document.documentElement.className.replace('no-js','js');</script>");
  h = h.replace(/<script>(?:(?!<\/script>)[\s\S])*cbit-mockup-notes[\s\S]*?<\/script>/i, "<script>document.documentElement.className=document.documentElement.className.replace('no-js','js');</script>");
  h = h.replace(/<!--[\s\S]*?-->/g, '');
  h = h.replace(/<style([^>]*)>([\s\S]*?)<\/style>/gi, (_, a, css) => `<style${a}>${css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\n\s*\n+/g, '\n')}</style>`);
  // Inline scripts: block comments carry internal working notes. (Line comments are kept: a "//" can sit in a URL string.)
  h = h.replace(/<script>([\s\S]*?)<\/script>/gi, (_, js) => `<script>${js.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\n\s*\n+/g, '\n')}</script>`);
  h = h.replace(/\s*<meta name="robots"[^>]*>/gi, ''); // tools/postbuild.mjs sets robots for every page
  if (DESCRIPTIONS[key]) h = h.replace(/<meta name="description" content="[^"]*">/i, `<meta name="description" content="${DESCRIPTIONS[key]}">`);
  // Links to stories or groups that were taken off: drop the list item or paragraph that holds only that link.
  // Both forms count: another page ("2026.09.30.site.x.html#frag") and this page ("#frag").
  const dangles = (a) => {
    const m = linkRe.exec(a); if (m) return isDangling(m[1], m[2]);
    const s = /href="#([^"]+)"/.exec(a); return Boolean(s) && !anchors[key].has(s[1]);
  };
  // Plain list items only (no id or data attributes): a card such as a research project is kept, and its
  // link loses the missing fragment below, so it opens the page instead.
  h = h.replace(/<li(?:\s+class="[^"]*")?>\s*(<a\b[^>]*>[\s\S]*?<\/a>)\s*<\/li>\s*/g, (li, a) => (dangles(a) ? (danglingRemoved++, '') : li));
  h = h.replace(/<p\b[^>]*>\s*(<a\b[^>]*>[\s\S]*?<\/a>)\s*<\/p>\s*/g, (p, a) => (dangles(a) ? (danglingRemoved++, '') : p));
  h = h.replace(/<div class="story-links">\s*<h3[^>]*>[\s\S]*?<\/h3>\s*<ul[^>]*>\s*<\/ul>\s*(<p class="section__foot">[\s\S]*?<\/p>)?\s*<\/div>\s*/g, (_, foot) => { emptyGroups++; return foot || ''; });
  // Clean addresses; a fragment that no longer exists is dropped.
  h = h.replace(/href="2026\.09\.30\.site\.([a-z0-9.]+)\.html(?:#([^"]*))?"/g, (_, k, frag) => {
    if (!(k in MAP)) throw new Error(`import-v4: ${key} links to unknown page ${k}`);
    return `href="${MAP[k]}${frag && !isDangling(k, frag) ? '#' + frag : ''}"`;
  });
  // Root-relative assets.
  h = h.replace(/(\s(?:src|href|poster)=")assets\//g, '$1/assets/');
  h = h.replace(/(\ssrcset=")([^"]*)"/g, (_, a, v) => `${a}${v.replace(/(^|,\s*)assets\//g, '$1/assets/')}"`);
  h = h.replace(/url\((['"]?)assets\//g, 'url($1/assets/');
  return h;
}

// 4. Remove the previous import, then write the new one.
if (existsSync(MANIFEST)) {
  for (const f of JSON.parse(readFileSync(MANIFEST, 'utf8')).files) rmSync(join(PUBLIC, f), { force: true });
}
const written = [];
const assets = new Set();
for (const [key, page] of Object.entries(html)) {
  if (ASTRO_OWNED.has(key)) continue;
  const h = clean(key, page);
  for (const m of h.matchAll(/(?:src|href|poster)="\/(assets\/[^"#?]+)"/g)) assets.add(m[1]);
  for (const m of h.matchAll(/srcset="([^"]+)"/g)) for (const part of m[1].split(',')) { const u = part.trim().split(/\s+/)[0]; if (u.startsWith('/assets/')) assets.add(u.slice(1)); }
  for (const m of h.matchAll(/url\(['"]?\/(assets\/[^'")]+)/g)) assets.add(m[1]);
  const rel = (MAP[key] === '/' ? '' : MAP[key].slice(1)) + 'index.html';
  mkdirSync(dirname(join(PUBLIC, rel)), { recursive: true });
  writeFileSync(join(PUBLIC, rel), h, 'utf8');
  written.push(rel);
}

// 4b. The bar and footer for the Astro-built pages, from the same cleaned design (links already clean).
{
  const h = clean(PARTIALS_FROM, html[PARTIALS_FROM]);
  const start = h.indexOf('<div class="ntu-bar"');
  const headerEnd = h.indexOf('</header>', start) + '</header>'.length;
  const footer = (/<footer class="site-footer">[\s\S]*?<\/footer>/.exec(h) || [])[0];
  if (start < 0 || headerEnd < start || !footer) throw new Error('import-v4: could not find the bar or footer to copy into src/partials/');
  const header = h.slice(start, headerEnd).replace(/\s+aria-current="page"/g, '');
  for (const part of [header, footer]) for (const m of part.matchAll(/(?:src|href)="\/(assets\/[^"#?]+)"/g)) assets.add(m[1]);
  writeFileSync(join(ROOT, 'src', 'partials', 'header.html'), header + '\n', 'utf8');
  writeFileSync(join(ROOT, 'src', 'partials', 'footer.html'), footer + '\n', 'utf8');
}

// 5. Assets: only what the imported pages use, plus the shared CSS, script and font, without internal comments.
const css = readFileSync(join(SITE, 'assets', 'css', 'site.v4.css'), 'utf8');
for (const m of css.matchAll(/url\(['"]?\.\.\/([^'")]+)/g)) assets.add('assets/' + m[1]);
const header = '/* CBIT Venture Builder, v4 design (30 September 2026). Commented source: CBIT OneDrive, collaterals/Web/Site/assets/. */\n';
const strip = (s) => header + s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]+$/gm, '').replace(/\n{3,}/g, '\n\n').trimStart();
const missing = [];
for (const a of assets) {
  if (a === 'assets/css/site.v4.css' || a === 'assets/js/site.v4.js') continue;
  const from = join(SITE, a);
  if (!existsSync(from)) { missing.push(a); continue; }
  mkdirSync(dirname(join(PUBLIC, a)), { recursive: true });
  copyFileSync(from, join(PUBLIC, a));
  written.push(a);
}
writeFileSync(join(PUBLIC, 'assets', 'css', 'site.v4.css'), strip(css), 'utf8');
writeFileSync(join(PUBLIC, 'assets', 'js', 'site.v4.js'), strip(readFileSync(join(SITE, 'assets', 'js', 'site.v4.js'), 'utf8')), 'utf8');
writeFileSync(MANIFEST, JSON.stringify({ note: 'Written by tools/import-v4.mjs; removed and rewritten on each import.', files: written.sort() }, null, 2) + '\n', 'utf8');
rmSync(work, { recursive: true, force: true });

console.log(`import-v4: ${written.filter((f) => f.endsWith('.html')).length} pages and ${written.length - written.filter((f) => f.endsWith('.html')).length} assets written to public/.`);
console.log(`  ${takenOff.length} unready stories or placeholders taken off their pages; ${dropped} flagged items dropped by the production build; ${emptyGroups} emptied story groups removed; ${danglingRemoved} links to removed stories taken out.`);
for (const t of takenOff) console.log('  off: ' + t);
if (missing.length) { console.error('import-v4: missing assets:\n  ' + missing.join('\n  ')); process.exit(1); }
