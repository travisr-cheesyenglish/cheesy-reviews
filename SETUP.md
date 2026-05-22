# Cheesy Reviews — GitHub + Netlify setup

This site has a **password-protected admin editor** at `/edit`. You add reviews in the browser; saves go to GitHub and Netlify rebuilds automatically.

**Bookmark your admin URL:** `https://YOUR-SITE.netlify.app/edit`  
(The public map does not show an Editor link.)

---

## Part 1 — Put the code on GitHub (one time)

### 1. Create a new repository on GitHub

1. Log in at [github.com](https://github.com).
2. Click **+** (top right) → **New repository**.
3. Name it something simple, e.g. `cheesy-reviews`.
4. Leave it **Private** or **Public** (your choice).
5. **Do not** check “Add a README” (you already have the project locally).
6. Click **Create repository**.

GitHub will show you commands — use the **“push an existing repository”** section in Part 2 below.

### 2. Push this folder from your Mac

Open Terminal and run (replace `YOUR_USERNAME` and `cheesy-reviews` with your repo name):

```bash
cd "/Users/trav/Desktop/Cheesy English 🧀 /Cheesy Reviews"

git init
git add .
git commit -m "Initial commit: Cheesy Reviews map and editor"

git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/cheesy-reviews.git
git push -u origin main
```

GitHub will ask you to sign in the first time. Use a **Personal Access Token** as the password if it asks (not your GitHub password):

1. GitHub → **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)**.
2. **Generate new token (classic)** → check **repo** → Generate.
3. Copy the token and paste it when Terminal asks for a password.

---

## Part 2 — Connect Netlify (one time)

### Option A — You already have a Netlify site

1. Go to [app.netlify.com](https://app.netlify.com) → open your existing site.
2. **Site configuration** → **Build & deploy** → **Continuous deployment** → **Link repository**.
3. Choose **GitHub** and authorize Netlify.
4. Select the `cheesy-reviews` repo, branch **main**.
5. Build settings (should match `netlify.toml` automatically):
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
6. Click **Deploy site**.

### Option B — New Netlify site

1. **Add new site** → **Import an existing project** → **GitHub**.
2. Pick `cheesy-reviews`, branch **main**, deploy.

Your live URL will look like `https://something.netlify.app`.

---

## Part 3 — Enable the admin editor (one time)

Netlify → your site → **Site configuration** → **Environment variables** → **Add a variable** (add all five):

| Key | What to put |
|-----|-------------|
| `SITE_EDIT_PASSWORD` | A strong password only you know (for `/edit`) |
| `GITHUB_TOKEN` | A GitHub token with **write** access to this repo (see below) |
| `GITHUB_OWNER` | Your GitHub username (e.g. `trav`) |
| `GITHUB_REPO` | Repo name only: `cheesy-reviews` |
| `GITHUB_BRANCH` | `main` |

### Create `GITHUB_TOKEN` (for saving reviews)

1. GitHub → **Settings** → **Developer settings** → **Personal access tokens**.
2. **Fine-grained token** (recommended):
   - Repository access: **Only** `cheesy-reviews`
   - Permissions → **Contents**: Read and write
3. Or **classic token** with **repo** scope.
4. Copy the token into Netlify as `GITHUB_TOKEN`.

After adding variables: **Deploys** → **Trigger deploy** → **Deploy site** (so functions pick up env vars).

---

## Part 4 — Use the editor (every time you add a review)

1. Open `https://YOUR-SITE.netlify.app/edit`
2. Enter `SITE_EDIT_PASSWORD`
3. **Add review** → pick country, paste student text, optional reply
4. **Save to site**
5. Wait ~1 minute for Netlify to finish deploying, then refresh the map

Countries on the globe come from each review’s country code (e.g. Japan = `JPN`). You do not add countries separately.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Editor says “not configured” | Add all env vars on Netlify and redeploy |
| Save fails 401 | Wrong password |
| Save fails 502 | `GITHUB_TOKEN` / owner / repo name wrong, or token lacks write access |
| Editor works locally but not on Netlify | Run `netlify dev` locally, or test only on the deployed URL |
| New country shows code instead of name | Add that country to `src/data/countryMeta.js` once, then redeploy |

---

## Quick reference

- **Public site:** `/`
- **Admin editor:** `/edit` (bookmark this)
- **Data file:** `public/reviews-site.json` (updated by the editor, not by hand)
