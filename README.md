# GlossarioBUDA Public Releases Site

A secure web application that makes releases from your **private** GitHub repository **publicly accessible** while keeping your source code private.

## Features

- 🔒 **Private repo, public releases** - Source code stays private, releases are public
- 🔄 **Auto-update compatible** - Works with your app's built-in update checker
- 📦 Lists all release assets with download functionality
- 🎨 Beautiful, responsive UI for browsing releases
- 📱 Mobile-friendly design
- 🚀 Deployed on Netlify with serverless functions
- 🔐 GitHub token secured on server, never exposed to users

## Architecture

```
┌─────────────────────┐
│  GlossarioBUDA App  │
│  (checks updates)   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│  glossariobudacompact.netlify.app              │
│  ┌────────────────────────────────────┐ │
│  │ Serverless Functions (Node.js)     │ │
│  │ - /releases (GitHub-compatible)    │ │
│  │ - /download-asset (proxy)          │ │
│  │ - /get-releases (web UI)           │ │
│  └───────────┬────────────────────────┘ │
└──────────────┼──────────────────────────┘
               │ (uses GitHub token)
               ▼
┌─────────────────────────────────────────┐
│  GitHub API                             │
│  Private repo: TashiRabten/GlossarioBUDA│
│  (releases only, code stays private)    │
└─────────────────────────────────────────┘
```

## Files

- `index.html` - Web UI for browsing releases
- `app.js` - Frontend JavaScript for the web UI
- `netlify.toml` - Netlify configuration
- `package.json` - Dependencies for serverless functions
- `netlify/functions/`
  - `releases.js` - **GitHub-compatible API** for app auto-updates
  - `get-releases.js` - Fetches all repos for web UI
  - `download-asset.js` - Proxies file downloads
- `.env.example` - Template for environment variables

## Setup & Deployment

### 1. Configure GitHub Token on Netlify

After deploying to Netlify, set the environment variable:

**In Netlify UI:**
1. Go to Site settings → Environment variables
2. Add variable:
   - Key: `GITHUB_TOKEN`
   - Value: Your GitHub personal access token

**Or via CLI:**
```bash
netlify env:set GITHUB_TOKEN your_token_here
```

### 2. Add/Remove Repositories

To configure which repos appear in the **web UI**, edit `netlify/functions/get-releases.js:9-13`:

```javascript
const REPOSITORIES = [
    { owner: 'TashiRabten', repo: 'GlossarioBUDA' },
    { owner: 'YourUsername', repo: 'AnotherRepo' },
];
```

The **auto-update API** (`/releases`) is hardcoded to GlossarioBUDA in `netlify/functions/releases.js:43-44`.

## API Endpoints

Once deployed on Netlify, your site provides these public endpoints:

### 1. GitHub-Compatible Releases API (for app auto-update)
```
GET https://glossariobudacompact.netlify.app/.netlify/functions/releases
```
Returns releases in GitHub API format. Use this in your app's update checker.

### 2. Download Asset (public download proxy)
```
GET https://glossariobudacompact.netlify.app/.netlify/functions/download-asset
    ?owner=TashiRabten
    &repo=GlossarioBUDA
    &assetId=12345
    &filename=app.exe
```
Proxies downloads from private repo releases.

### 3. Web UI API (multi-repo)
```
GET https://glossariobudacompact.netlify.app/.netlify/functions/get-releases
```
Returns releases from all configured repos for the web UI.

## Updating Your GlossarioBUDA App

To enable auto-updates from your private repo, change the update check URL in your app:

**Before (doesn't work with private repos):**
```javascript
const updateURL = 'https://api.github.com/repos/TashiRabten/GlossarioBUDA/releases';
```

**After (works with private repos):**
```javascript
const updateURL = 'https://glossariobudacompact.netlify.app/.netlify/functions/releases';
```

The API returns the exact same JSON format as GitHub, so your existing update logic should work without changes. Download URLs are automatically rewritten to use the Netlify proxy.

## Deployment to Netlify

### Option 1: Netlify UI (Recommended)

1. **Push to GitHub** (if not already done):
   ```bash
   git push origin main
   ```

2. **Deploy on Netlify:**
   - Go to https://app.netlify.com/
   - Click "Add new site" → "Import an existing project"
   - Choose "GitHub" and authorize
   - Select repository: `TashiRabten/rel-site-2025`
   - Settings auto-detect from `netlify.toml`
   - **IMPORTANT:** Add environment variable:
     - Key: `GITHUB_TOKEN`
     - Value: `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`
   - Click "Deploy site"

3. **Configure custom domain** (optional):
   - In Site settings → Domain management
   - Your current subdomain: `glossariobudacompact.netlify.app`

### Option 2: Netlify CLI

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Initialize site
netlify init

# Set environment variable
netlify env:set GITHUB_TOKEN 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

# Deploy
netlify deploy --prod
```

### Local Testing with Netlify Dev

```bash
# Install dependencies
npm install

# Create .env file
echo "GITHUB_TOKEN=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" > .env

# Run locally (simulates Netlify environment)
netlify dev
```

Then visit: `http://localhost:8888`

## Security & Privacy

### How It Works

✅ **GitHub token is secure:**
- Stored as environment variable on Netlify servers
- Never exposed to users or in browser code
- Only serverless functions can access it

✅ **Repository stays private:**
- Source code remains completely private
- Only releases and assets are accessible
- No way to access repo files or commits through this site

✅ **Public releases:**
- Anyone can view and download releases via the Netlify site
- Perfect for distributing proprietary software
- Works with app auto-updaters

✅ **CORS enabled:**
- Apps from any domain can check for updates
- Downloads work from any origin

### GitHub Token Permissions

Your GitHub token needs:
- **Scope:** `repo` (Full control of private repositories)
- **Purpose:** Read releases and download assets from private repos
- **Security:** Stored securely in Netlify environment variables

### Best Practices

1. **Rotate your token periodically** - Generate a new token every few months
2. **Use environment variables only** - Never commit tokens to git
3. **Monitor token usage** - Check GitHub settings for token activity
4. **Limit token scope** - Only grant `repo` access, nothing more

## Workflow: Releasing a New Version

Here's the complete workflow for releasing a new version of your app:

### 1. Create a Release on GitHub

```bash
# In your GlossarioBUDA repo
git tag v1.2.3
git push origin v1.2.3
```

Then on GitHub:
1. Go to `TashiRabten/GlossarioBUDA` → Releases
2. Click "Draft a new release"
3. Choose tag: `v1.2.3`
4. Add release notes
5. Upload your build artifacts (exe, dmg, etc.)
6. Click "Publish release"

### 2. Releases Automatically Become Public

- Your private repo release is now accessible at:
  - Web UI: `https://glossariobudacompact.netlify.app/`
  - API: `https://glossariobudacompact.netlify.app/.netlify/functions/releases`
- No need to redeploy the Netlify site
- No need to do anything else!

### 3. Users Get Auto-Updates

- Your app checks the Netlify API endpoint
- Detects the new version
- Downloads through the Netlify proxy
- Updates automatically

**That's it!** The entire process is automated once set up.

## Troubleshooting

### Releases not loading on Netlify site
- Check Netlify function logs in the Netlify dashboard
- Verify `GITHUB_TOKEN` environment variable is set
- Ensure token has `repo` scope
- Check that repository name is correct in serverless functions

### App not detecting updates
- Verify app is using new URL: `https://glossariobudacompact.netlify.app/.netlify/functions/releases`
- Check app's network requests in developer tools
- Ensure CORS is working (should be, it's enabled)
- Test the endpoint manually: `curl https://glossariobudacompact.netlify.app/.netlify/functions/releases`

### Downloads failing
- Check that asset IDs are correct
- Verify download-asset function has GITHUB_TOKEN
- Test download URL manually in browser

### Local development issues
- Make sure `.env` file exists with `GITHUB_TOKEN`
- Run `netlify dev` instead of regular local server
- Install dependencies with `npm install`

## Customization

### Change Site Branding
Edit `index.html:250-252`:
```html
<h1>🔒 Your App Name Releases</h1>
<p>Your custom tagline here</p>
```

### Change Colors
Edit the CSS gradient in `index.html:16`:
```css
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
```

### Support Multiple Apps
Add more repositories in `netlify/functions/get-releases.js`:
```javascript
const REPOSITORIES = [
    { owner: 'TashiRabten', repo: 'GlossarioBUDA' },
    { owner: 'TashiRabten', repo: 'AnotherApp' },
];
```

For separate auto-update endpoints, duplicate `releases.js` and change the repo.

## Author

Tashi Rabten

## License

Private use only
