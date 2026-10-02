// Post-build guards: run on the built site in dist/ after `astro build` (npm run build runs both).
// Ported from the public rules of the mockup build (build-mockups.v4.mjs). The private word lists
// (retired wording, never-public figures, names awaiting approval) are NOT here: they stay in OneDrive.
// Actions logs are public, so failures print a rule id and a file path, never page text.
// Node built-ins only.
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = fileURLToPath(new URL('../dist/', import.meta.url));
const STRICT_LINKS = process.argv.includes('--strict-links');
const ALLOWED_EMAILS = new Set(['cbit@ntu.ac.uk', 'cbit.vb@ntu.ac.uk', 'cbit.edu@ntu.ac.uk']);
const GENERIC_BANNED = [/lorem ipsum/i, /\bPartner 2\b/, /\(CHECK\)/, /\bTODO\b/, /\bper the CV\b/i, /\(KB\b/, /\bAirtable\b/];

if (!existsSync(DIST)) {
  console.error('guards: dist/ not found. Run `astro build` first.');
  process.exit(1);
}

const files = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else files.push(p);
  }
})(DIST);

const pages = files.filter((f) => f.endsWith('.html'));
const builtPaths = new Set(
  files.map((f) => '/' + relative(DIST, f).split(sep).join('/')).flatMap((u) => (u.endsWith('/index.html') ? [u, u.slice(0, -'index.html'.length)] : [u])),
);

const errors = [];
const warnings = [];
const fail = (rule, file, detail = '') => errors.push(`${rule}  ${relative(DIST, file)}${detail ? '  ' + detail : ''}`);

/** Visible text only: drop scripts, styles and tags. */
const visibleText = (html) =>
  html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ');

for (const file of pages) {
  const html = readFileSync(file, 'utf8');

  // structure: exactly one <h1>
  const h1 = (html.match(/<h1[\s>]/gi) || []).length;
  if (h1 !== 1) fail('structure/one-h1', file, `found ${h1}`);

  // structure: every image has an alt attribute (empty alt is allowed for decorative images)
  for (const img of html.match(/<img\b[^>]*>/gi) || []) {
    if (!/\balt=/.test(img)) fail('structure/img-alt', file);
  }

  // structure: unique ids
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dup.length) fail('structure/duplicate-id', file, [...new Set(dup)].join(','));

  // review flags never reach the output
  if (/\sdata-(review|publish|status)=/.test(html)) fail('review/flag-in-output', file);
  if (/class="review-(bar|drawer)/.test(html)) fail('review/toolbar-in-output', file);

  // (f) Safelinks
  for (const m of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    if (/safelinks\.protection\.outlook\.com|[?&]data=/i.test(m[1])) fail('f/safelinks', file);
  }

  // (g) only the three CBIT inboxes
  for (const m of html.matchAll(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g)) {
    const addr = m[0].toLowerCase();
    if (/\.(png|jpe?g|svg|webp|gif|avif|woff2?)$/.test(addr)) continue; // e.g. logo@2x.png
    if (!ALLOWED_EMAILS.has(addr)) fail('g/email-address', file, addr.replace(/^[^@]+/, '***'));
  }

  // (e) and generic placeholders in visible text
  const text = visibleText(html);
  for (const re of GENERIC_BANNED) if (re.test(text)) fail('e/banned-generic', file, String(re));

  // (j) heading words
  for (const m of html.matchAll(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi)) {
    if (/\b(evidence|proof)\b|\bis real\b/i.test(m[1].replace(/<[^>]+>/g, ''))) fail('j/heading-words', file);
  }

  // links: internal links must resolve. Pages not migrated yet only warn until --strict-links (launch).
  for (const m of html.matchAll(/(?:href|src)="(\/[^"#?]*)/g)) {
    const u = m[1];
    if (u.startsWith('//')) continue;
    if (builtPaths.has(u)) continue;
    const msg = `links/internal  ${relative(DIST, file)}  ${u}`;
    if (STRICT_LINKS) errors.push(msg);
    else warnings.push(msg);
  }
}

const uniqueWarnings = [...new Set(warnings.map((w) => w.split('  ').pop()))];
if (uniqueWarnings.length) {
  console.log(`guards: ${uniqueWarnings.length} internal link target(s) not built yet (pages still to migrate; fatal with --strict-links):`);
  for (const u of uniqueWarnings.sort()) console.log('  ' + u);
}
if (errors.length) {
  console.error(`guards: ${errors.length} problem(s):`);
  for (const e of errors) console.error('  ' + e);
  process.exit(1);
}
console.log(`guards: ${pages.length} page(s) passed.`);
