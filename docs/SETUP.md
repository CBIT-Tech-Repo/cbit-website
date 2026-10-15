# Setting up GitHub, Pages CMS and Cloudflare

These steps are done once, by an owner of the CBIT-Tech-Repo organisation and of CBIT's Cloudflare account. They set up the News and events pilot. Screen labels follow GitHub, Pages CMS and Cloudflare as of October 2026 and may move.

This guide describes how things are set up. Progress, decisions and the dated action log live in the team's internal migration runbook, not in this repository.

## 1. Create the repository

1. In GitHub, open the **CBIT-Tech-Repo** organisation, then create a repository named `cbit-website`.
   - **Visibility: private.** The repository was created private on 2 October 2026. XM's earlier decision (D1, 28 September) was public, and XM confirms the change.
   - **Plan.** While CBIT-Tech-Repo is on GitHub Free, a private repository has no rulesets, no required checks and no compulsory code-owner approval. Step 2 explains what that means and how to fix it.
   - Leave "Add a README" unticked, because this repository brings its own.
2. Push this folder from a computer that has it. A computer without it can first clone the repository bundle the team keeps internally, into a folder outside OneDrive. Then push:

   ```bash
   git remote add origin https://github.com/CBIT-Tech-Repo/cbit-website.git
   git push -u origin main
   ```

3. Create the pilot's editing branch:

   ```bash
   git push origin main:edit/news-events
   ```

## 2. Repository settings

**Organisation settings.** Under **Authentication security**, require two-factor authentication.

**Repository settings, General:**

- Under **Features**, turn off Wikis and Discussions. Keep Issues off too, because internal tracking stays in OneDrive and Asana.
- Under **Pull Requests**, allow merge commits. Leave "Automatically delete head branches" off, because the `edit/*` branches are kept.

**Repository settings, Actions:**

- Under **General**, tick "Allow GitHub Actions to create and approve pull requests", which the pull-request workflow needs.
- **Actions minutes.** A private repository on GitHub Free has 2,000 minutes a month, and GitHub Team has 3,000. Each check run takes about a minute.

**Repository settings, Collaborators and teams.** Give write access to the owners and deputies who approve. Each of them needs a GitHub account with two-factor authentication. Editors invited only through Pages CMS need no GitHub account.

**Edit `.github/CODEOWNERS`.** Replace each placeholder, such as `@EVELYN_GITHUB`, with the person's GitHub username, and commit it on a branch through a pull request.

**First, the plan.** Rulesets on a private repository need GitHub Team. On GitHub Free, the Rulesets page will not let you enforce them.

- **Without Team, nothing stops a change reaching the live site unapproved.**
  - Anyone with write access can push straight to `main`.
  - Pages CMS can save straight to `main` if an editor switches to that branch.
  - The `build` check still runs on every push, but it cannot block a merge.
  - The only remaining safety net is that a failed build never deploys on Cloudflare.
- **Recommended: move CBIT-Tech-Repo to GitHub Team before inviting any editor in Pages CMS.**
  - It costs about US$4 per organisation member a month.
  - Editors invited by email in Pages CMS are not members, so they need no seat.
  - Upgrade under Organisation settings, then Billing and plans.
  - Alternatively, ask whether verified academic staff can get GitHub Team free through GitHub Education.
- **Until then,** run the pilot as a convention: owners merge only approved pull requests, and editors work only on their `edit/*` branch.

**Repository settings, Rules, Rulesets.** Once on GitHub Team, create a new branch ruleset named `main`:

- **Enforcement:** Active. **Bypass list:** empty. **Target:** the default branch. Add `staging` later, when it exists.
- Restrict deletions, and block force pushes.
- Require a pull request before merging, with these settings:
  - 1 required approval;
  - dismiss stale approvals;
  - require review from Code Owners;
  - require approval of the most recent push;
  - allowed merge method: merge.
- Require status checks to pass. Add the check named `build`; it appears after the first push has run.

## 3. Pages CMS

1. An organisation owner installs the Pages CMS GitHub App from https://github.com/apps/pages-cms. Choose **Only select repositories**, then `cbit-website`. Never install it on all repositories, because it asks for administration rights.
2. Sign in at https://app.pagescms.org with GitHub, and open `cbit-website`.
3. Switch to the branch `edit/news-events`. The sidebar shows **News and events · owner Evelyn Xie**.
4. Under **Collaborators**, invite Evelyn by her NTU email. She signs in with a one-time code sent to that address, and needs no GitHub account.
5. Briefing for every editor:
   - Work only on your section's branch.
   - Enter only items the clearance tracker marks cleared.
   - Upload photos one at a time, each under 4.5 MB.
   - If something uncleared is saved by mistake, tell Georgi and the section owner at once.

## 4. Cloudflare Pages, connected to GitHub

1. In Cloudflare, go to **Workers & Pages**, then **Create**. Switch to the **Pages** tab, then choose **Connect to Git**.
   - Cloudflare's create screen opens on Workers by default. Its "Import a repository" option builds a Worker, which needs a Wrangler configuration file this repository does not have.
   - Use Pages: it reads `public/_headers` and `public/_redirects` as they are, and gives each branch its own preview address.
2. Authorise Cloudflare's GitHub app for `CBIT-Tech-Repo/cbit-website` only, and choose the repository.
3. Name the project `cbit-website` and set up the build:
   - production branch `main`;
   - framework preset Astro;
   - build command `npm run build`;
   - output directory `dist`.
   No environment variables are needed, because `.nvmrc` sets the Node version.
4. Under **Settings**, **Builds**, then **Branch control**, set preview branches to Custom, and include `edit/*`, `dev/*` and `staging`.
5. Under **Notifications**, add a "Pages: Deployment failed" alert to the shared web inbox. Until that inbox exists, send it to Georgi and Zeng.
6. **Domains.** cbitx.com's DNS stays at GoDaddy, and its nameservers never change (XM, 2 October 2026). The domain also serves other live sites through its own subdomains, so every change is one record at GoDaddy, approved by XM at the time. Never edit a record this project did not add.
   - **Order for every domain:** first add the custom domain in this Pages project, then add or change the CNAME at GoDaddy. A CNAME made first can give error 522.
   - **www.cbitx.com, at launch.** In this project, go to **Custom domains** and add `www.cbitx.com`. Then, at GoDaddy, change the existing `www` CNAME, which points to the parking page, to `cbit-website.pages.dev`.
   - **Bare cbitx.com, at launch.** It cannot be attached to Pages without a Cloudflare zone. Use GoDaddy's domain forwarding to send it to `https://www.cbitx.com` with a 301. Test that `https://cbitx.com` forwards without a certificate warning before relying on it.
   - **Release previews.** A branch such as `staging` previews at `staging.cbit-website.pages.dev`. Lock the previews under **Settings**, then **General**, then **Access policy**. An Access lock needs a Cloudflare zone, so it cannot cover a branch on a cbitx.com subdomain.
   - **staging.cbitx.com** is served by GitHub Pages from this repository's `staging` branch (workflow `.github/workflows/deploy-staging.yml`; no Cloudflare is involved). The custom domain is set in the repository's Pages settings, and GoDaddy holds one CNAME: `staging` to `cbit-tech-repo.github.io`. Every page carries noindex. The design mockups stay outside this repository.

## 5. The pilot test

The pilot passes when Evelyn does all of this without developer help:

1. She clears one real news item in the OneDrive tracker, then enters it in Pages CMS on `edit/news-events`.
2. The pull request opens by itself, and the `build` check passes. She opens the Cloudflare preview from the pull request.
3. An owner approves in GitHub and merges. The item appears on www.cbitx.com, which still carries noindex.
4. She saves an item with a broken link, for example one starting `http://`. The `build` check fails, and the merge is blocked.
5. She sets an item to Hidden, it is approved and merged, and it disappears from the site.

Record how long each step took. Before moving the next section, also confirm these points:

- The Pages CMS key names in `.pages.yml` work as written.
- Curly quotes and non-breaking spaces survive a save in the rich-text field (Pages CMS issue #424).
- An uploaded photo shows correctly.
