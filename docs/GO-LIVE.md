# Going live on www.cbitx.com

The live site is this repository's `main` branch, published by GitHub Pages through `.github/workflows/deploy-production.yml`. It combines two parts:

- **News and events** is built by Astro from `src/content/`, and editors change it in Pages CMS.
- **Every other page** is the approved v4 design, imported as static pages into `public/` by `tools/import-v4.mjs`. Those pages move into Astro and Pages CMS one section at a time after launch.

Progress, decisions and content clearance are kept in the team's internal runbook, not here.

## 1. Refresh the imported pages

Run this on a computer with CBIT's OneDrive, from a working copy outside OneDrive:

```bash
npm ci
npm run import-v4 -- --site "<OneDrive>/Documents - CBIT/collaterals/Web/Site"
npm run build
```

**What the import does:**

- It uses the mockups' own production build.
- It takes off every story or placeholder that is not marked ready.
- It drops every item flagged as needing confirmation.
- It removes review notes, the review toolbar and internal comments.
- It rewrites links to clean addresses and removes links to stories that were taken off.

**The import changes nothing in OneDrive.** To publish an item that was held back, mark it ready in the mockup sources, then import again.

**Then publish it.** Commit the changes in `public/` on a `dev/` branch, open a pull request, and merge it once the `build` check passes.

## 2. Repository protection

The repository is public, so branch rules are free.

1. In **Settings**, then **Rules**, create a ruleset on `main`. It should require a pull request with one approval and review from Code Owners, require the `build` status check, and block force pushes and deletion.
2. Put real usernames in `.github/CODEOWNERS`.

## 3. Hosting

1. Go to **Settings**, then **Pages**. Set the source to **GitHub Actions**, and the custom domain to `www.cbitx.com`.
2. In **Settings**, then **Environments**, then `github-pages`, make sure `main` may deploy.
3. Tick **Enforce HTTPS** once GitHub has issued the certificate, which can take up to an hour after DNS resolves.
4. Recommended: verify cbitx.com for the organisation, under the organisation's **Settings**, then **Pages**. GitHub gives one TXT record to add. That stops any other GitHub account claiming a cbitx.com address.

## 4. DNS at GoDaddy, on launch day

The nameservers stay at GoDaddy. cbitx.com also serves other sites, so change only the records below, and only with the domain owner's approval.

| Record | Change | Why |
|---|---|---|
| `www` CNAME | Change the value from `cbitx.com` to `cbit-tech-repo.github.io` | Serves the site at www.cbitx.com |
| `@` A records, recommended | Replace the two parking addresses with GitHub's: `185.199.108.153`, `185.199.109.153`, `185.199.110.153` and `185.199.111.153` | GitHub then redirects https://cbitx.com to www, with a valid certificate |
| `@`, alternative | Keep the parking records and use GoDaddy forwarding to `https://www.cbitx.com` (301) | Fewer changes, but test first that https://cbitx.com forwards without a certificate warning |

Count the records before and after, and check the other subdomains still answer.

## 5. Launch

1. Under **Settings**, then **Secrets and variables**, then **Actions**, then **Variables**, set `PUBLIC_NOINDEX` to `false`. Then re-run **Deploy production**.
2. Check the site:
   - https://www.cbitx.com/robots.txt allows crawling and lists the sitemap.
   - Pages no longer carry `noindex`.
   - https://cbitx.com redirects to www.
3. Optionally, submit `https://www.cbitx.com/sitemap.xml` in Google Search Console.

## Visitor statistics and Google Search Console

Both are off until their repository variable is set (**Settings**, then **Secrets and variables**, then **Actions**, then **Variables**). Then re-run **Deploy production**. Both values are public, because they appear in the page source, so they are variables, not secrets.

| Variable | Where the value comes from | What it does |
|---|---|---|
| `PUBLIC_CF_ANALYTICS_TOKEN` | Cloudflare dashboard: **Analytics & Logs**, then **Web Analytics**, then **Add a site**, with hostname `www.cbitx.com`. From the snippet, copy only the 32-character `token` value. | Adds Cloudflare Web Analytics to every page (no cookies, so no consent banner), and adds a "Visitor statistics" section to the privacy page. The `privacy/notice-mismatch` guard fails the build if the two ever disagree. |
| `PUBLIC_GOOGLE_SITE_VERIFICATION` | Google Search Console: **Add property**, then **URL prefix** `https://www.cbitx.com/`, then the **HTML tag** method. Copy only the `content="..."` value. | Adds Google's ownership tag to the home page, so Search Console can verify the site. Visitors are not affected. |

To switch either one off, delete the variable and re-run **Deploy production**. The `privacy/outside-script` guard fails the build if any other outside script appears on a page.

## 6. Rolling back

- **Content or code:** revert the merge on `main`, and the deploy runs again with the previous version. You can also re-run **Deploy production** from an earlier run.
- **Address:** set the `www` CNAME back to `cbitx.com` at GoDaddy.

## After launch: who edits what

- **News and events.** Edit in Pages CMS on the `edit/news-events` branch. Saving opens a pull request, and the section owner approves it.
- **Every other page,** until it moves to Pages CMS. Change the mockup sources in OneDrive, run the import, and open a pull request.
