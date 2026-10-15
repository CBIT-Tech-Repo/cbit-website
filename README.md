# cbit-website

The CBIT Venture Builder website, built with [Astro](https://astro.build), edited in [Pages CMS](https://pagescms.org) and hosted on Cloudflare Pages.

**Status:** ready to launch. News and events is built in Astro and edited in Pages CMS. Every other page is the approved v4 design, imported as static pages by `tools/import-v4.mjs` until its section moves to Pages CMS. See `docs/GO-LIVE.md`.

## How a change goes live

1. An editor saves in Pages CMS on their section's branch, for example `edit/news-events`.
2. A workflow opens a pull request into `main`, and Cloudflare builds a preview of the branch.
3. The `build` check runs the site build, the content schemas and the guards.
4. The section's owner, listed in `.github/CODEOWNERS`, checks the preview and approves.
5. The merge goes live on www.cbitx.com.

Only cleared content is entered. Everything saved here can be read by anyone with access to the repository, including drafts, branches and history. Review notes, consents and approvals stay in OneDrive.

## Working on the code

You need Node 22.12 or later; `.nvmrc` pins the version Cloudflare and CI use.

```bash
npm ci
npm run dev      # http://localhost:4321
npm run build    # astro build, then the guards in guards/check-dist.mjs
```

Keep your working copy outside OneDrive, for example in `C:\dev\cbit-website`. Change code on a `dev/<topic>` branch and open a pull request.

## Where things are

| Path | What it is |
|---|---|
| `src/content/` | The content editors change in Pages CMS |
| `src/content.config.ts` | The schemas every entry must pass |
| `src/pages/`, `src/layouts/`, `src/partials/` | Templates (developers only) |
| `public/assets/` | The v4 design: CSS, script, font and logos |
| `public/media/` | Images uploaded in Pages CMS |
| `guards/check-dist.mjs` | Checks run on the built site |
| `tools/import-v4.mjs` | Imports the cleared v4 pages into `public/` |
| `tools/postbuild.mjs` | Robots setting, robots.txt and sitemap.xml |
| `.pages.yml` | The Pages CMS forms |
| `docs/SETUP.md` | How GitHub, Pages CMS and Cloudflare are set up |
