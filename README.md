# Pratham Gupta — Portfolio

Personal portfolio site. Single static HTML file, no build step, no dependencies.

**Live:** https://prathamgupta.vercel.app

---

## Deploying to Vercel via GitHub

### 1. Create the GitHub repository

On [github.com/new](https://github.com/new), create a repository named `portfolio`. Leave it empty — no README, no `.gitignore` (this repo already has them).

### 2. Push these files

From the folder containing these files:

```bash
git init
git add .
git commit -m "Portfolio site"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/portfolio.git
git push -u origin main
```

### 3. Import into Vercel

1. Go to [vercel.com/new](https://vercel.com/new) and sign in with GitHub.
2. Click **Import** next to your `portfolio` repository.
3. Leave every field at its default:
   - **Framework Preset:** Other
   - **Build Command:** *(empty)*
   - **Output Directory:** *(empty)*
   - **Install Command:** *(empty)*
4. Click **Deploy**.

It's a static site, so there is nothing to build — the deploy takes a few seconds. Every push to `main` redeploys automatically.

### 4. Set your URL

Vercel assigns something like `portfolio-abc123.vercel.app`. To get a cleaner one:

**Project → Settings → Domains → Edit** the `.vercel.app` domain and change it to `prathamgupta.vercel.app` (if free).

Then **find and replace `prathamgupta.vercel.app` with your real domain** in these three files:

- `index.html` — canonical link, Open Graph tags, Twitter tags, JSON-LD
- `robots.txt` — sitemap line
- `sitemap.xml` — the `<loc>` value

Commit and push. If you skip this, the site still works, but LinkedIn and WhatsApp previews will point at the wrong URL.

---

## Files

| File | Purpose |
|---|---|
| `index.html` | The entire site. Photo is embedded as base64, so it works standalone. |
| `og-image.png` | 1200×630 social preview shown when the link is shared. |
| `favicon.svg` | Browser tab icon — the shelf tag and barcode mark. |
| `vercel.json` | Security headers plus cache rules (images cached a year, HTML never). |
| `robots.txt` | Allows all crawlers, points to the sitemap. |
| `sitemap.xml` | Single-page sitemap for search engines. |
| `headshot.jpg` | Source photo, kept for regenerating the OG image later. |

---

## Editing

Open `index.html` in any text editor. Everything is in one file — CSS in `<style>` at the top, content in the body, the small amount of JavaScript at the bottom.

Common edits:

- **Contact details** — search for `prathamg329` and `pgupta05`
- **Ledger figures** — the `<div class="ldg">` block; each row is one line
- **Percentage chips** — the `<div class="pct">` block
- **Work tabs** — four `<div class="panel">` blocks; keep the `id` and `aria-controls` pairs matching
- **Colours** — the `:root` variables at the very top of the `<style>` block

After changing any content, regenerate `og-image.png` if the headline or the four hero stats changed, otherwise the shared preview will be out of date.

## Adding a résumé download

1. Drop `resume.pdf` into this folder.
2. In `index.html`, find the hero buttons and add:

```html
<a class="btn" href="/resume.pdf" target="_blank" rel="noopener">Résumé</a>
```

3. Commit and push.

---

## Checks before sharing

- [ ] Domain replaced in `index.html`, `robots.txt`, `sitemap.xml`
- [ ] Link preview tested at [opengraph.xyz](https://www.opengraph.xyz)
- [ ] Email, phone and LinkedIn links all open correctly
- [ ] Opened on a phone as well as a laptop
- [ ] Certificate names match your actual certificates
