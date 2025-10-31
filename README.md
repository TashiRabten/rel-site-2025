# Private Repository Releases Site

A secure, static web application to display and download releases from your private GitHub repositories. Only accessible to those with the direct link.

## Features

- 🔒 Displays releases from private GitHub repositories
- 📦 Lists all release assets with download functionality
- 🎨 Beautiful, responsive UI
- 📱 Mobile-friendly design
- 🚀 Easy to deploy to GitHub Pages
- 🔐 Secure access via obscure URL

## Files

- `index.html` - Main HTML structure and styling
- `app.js` - JavaScript logic for fetching and displaying releases
- `README.md` - This file

## Configuration

### 1. Update GitHub Token (if needed)

Your token is already configured in `app.js`. If you need to change it:

```javascript
const GITHUB_TOKEN = 'your_token_here';
```

### 2. Add/Remove Repositories

Edit the `REPOSITORIES` array in `app.js`:

```javascript
const REPOSITORIES = [
    { owner: 'TashiRabten', repo: 'GlossarioBUDA' },
    { owner: 'YourUsername', repo: 'AnotherRepo' },
    // Add more repositories as needed
];
```

## Deployment Options

### Option 1: GitHub Pages (Recommended)

This is the easiest way to host your site with a secure, obscure URL.

1. **Create a new PRIVATE repository on GitHub:**
   ```bash
   # Initialize git in this directory
   cd private-releases-site
   git init
   git add .
   git commit -m "Initial commit: Private releases site"
   ```

2. **Create a private repo on GitHub:**
   - Go to https://github.com/new
   - Name it something obscure like `pr-xyz-2025` (hard to guess)
   - Make it **PRIVATE**
   - Don't add README, .gitignore, or license

3. **Push your code:**
   ```bash
   git remote add origin https://github.com/YourUsername/pr-xyz-2025.git
   git branch -M main
   git push -u origin main
   ```

4. **Enable GitHub Pages:**
   - Go to repository Settings → Pages
   - Source: Deploy from a branch
   - Branch: `main` → `/root` → Save
   - Wait a few minutes

5. **Access your site:**
   - Your site will be at: `https://yourusername.github.io/pr-xyz-2025/`
   - Only people with this exact URL can access it

### Option 2: Local Testing

To test locally:

1. **Using Python:**
   ```bash
   cd private-releases-site
   python -m http.server 8000
   ```
   Then visit: `http://localhost:8000`

2. **Using Node.js:**
   ```bash
   npx http-server -p 8000
   ```
   Then visit: `http://localhost:8000`

3. **Or just open the file:**
   - Simply double-click `index.html` in your file browser
   - Note: Downloads may not work due to CORS restrictions in some browsers

### Option 3: Other Hosting Platforms

You can also deploy to:
- **Netlify**: Drag and drop the folder
- **Vercel**: Connect your GitHub repo
- **Cloudflare Pages**: Connect your repo

## Security Considerations

### Current Approach (Client-Side Token)
- ✅ Quick and easy to deploy
- ✅ Works great for personal use
- ⚠️ Token is visible in browser source code
- ⚠️ Anyone with the URL can see the token

### Making it More Secure

If you want better security, consider these options:

1. **Use GitHub Pages from a private repo:**
   - Only people with the exact URL can access
   - Use an obscure repository name
   - Don't share the link publicly

2. **Add a simple password protection:**
   - Add a password prompt before showing releases
   - Password is hardcoded in JavaScript

3. **Use a backend service (more complex):**
   - Deploy the Node.js proxy script you showed me
   - Frontend calls your backend instead of GitHub directly
   - Token stays secure on the server

## Token Permissions

Your GitHub token needs these permissions:
- `repo` - Full control of private repositories
  - Needed to read releases and download assets from private repos

## Troubleshooting

### Releases not loading
- Check browser console for errors (F12)
- Verify token has correct permissions
- Ensure repository names are correct

### Downloads not working
- Must be served via HTTP/HTTPS (not file://)
- Use local server or deploy to a hosting platform

### GitHub Pages not working
- Ensure repository is set to private
- Wait a few minutes after enabling Pages
- Check Settings → Pages for the published URL

## Customization

### Change Colors
Edit the CSS in `index.html`:
```css
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
```

### Add More Info
You can display additional release information by editing the `renderRelease()` function in `app.js`.

### Filter Releases
Add filtering logic in `fetchReleases()` to only show specific releases (e.g., non-draft, stable versions).

## Usage

Once deployed:
1. Visit your site URL
2. All releases from configured repositories will load automatically
3. Click "Download" on any asset to download it
4. Share the URL only with people you trust

## Author

Tashi Rabten

## License

Private use only
