# GlossarioBUDA App: Update to Use Netlify Releases API

This guide shows you how to update your GlossarioBUDA app to check for updates from the Netlify-hosted public releases API instead of directly from GitHub.

## Why This Change?

- **Private repo, public releases**: Your source code stays private, but users can download releases
- **No authentication needed**: Users don't need GitHub tokens
- **Auto-update keeps working**: Your app's update checker continues to function normally

## Code Changes Required

### 1. Find Your Update Check Code

Look for code that checks for updates from GitHub. It probably looks something like this:

```javascript
// OLD CODE - Don't use this anymore
const updateURL = 'https://api.github.com/repos/TashiRabten/GlossarioBUDA/releases';

fetch(updateURL)
  .then(response => response.json())
  .then(releases => {
    const latestRelease = releases[0];
    // Check version, show update prompt, etc.
  });
```

### 2. Change the URL

Simply replace the GitHub API URL with the Netlify API URL:

```javascript
// NEW CODE - Use this
const updateURL = 'https://glossariobuda.netlify.app/.netlify/functions/releases';

fetch(updateURL)
  .then(response => response.json())
  .then(releases => {
    const latestRelease = releases[0];
    // Check version, show update prompt, etc.
    // No other changes needed - same data structure!
  });
```

### 3. Download URLs Work Automatically

The Netlify API automatically rewrites download URLs, so your download code should work without changes:

```javascript
// This works automatically - no changes needed
const latestRelease = releases[0];
const downloadUrl = latestRelease.assets[0].browser_download_url;
// This URL now points to Netlify proxy, not GitHub directly
```

## Example: Complete Update Checker

Here's a complete example of an update checker that works with the new API:

```javascript
const CURRENT_VERSION = '1.0.0'; // Your app's current version
const UPDATE_CHECK_URL = 'https://glossariobuda.netlify.app/.netlify/functions/releases';

async function checkForUpdates() {
  try {
    const response = await fetch(UPDATE_CHECK_URL);

    if (!response.ok) {
      console.error('Failed to check for updates');
      return null;
    }

    const releases = await response.json();

    if (releases.length === 0) {
      console.log('No releases found');
      return null;
    }

    const latestRelease = releases[0];
    const latestVersion = latestRelease.tag_name.replace('v', '');

    if (isNewerVersion(latestVersion, CURRENT_VERSION)) {
      return {
        version: latestVersion,
        name: latestRelease.name,
        releaseNotes: latestRelease.body,
        downloadUrl: latestRelease.assets[0]?.browser_download_url,
        publishedAt: latestRelease.published_at
      };
    }

    return null; // Already on latest version
  } catch (error) {
    console.error('Error checking for updates:', error);
    return null;
  }
}

function isNewerVersion(latest, current) {
  const latestParts = latest.split('.').map(Number);
  const currentParts = current.split('.').map(Number);

  for (let i = 0; i < 3; i++) {
    if (latestParts[i] > currentParts[i]) return true;
    if (latestParts[i] < currentParts[i]) return false;
  }

  return false;
}

// Usage
checkForUpdates().then(update => {
  if (update) {
    console.log(`New version available: ${update.version}`);
    console.log(`Download from: ${update.downloadUrl}`);
    // Show update notification to user
  } else {
    console.log('You are on the latest version');
  }
});
```

## Common Frameworks

### Electron with electron-updater

If you're using `electron-updater`, update your `electron-builder.yml`:

```yaml
# OLD
publish:
  provider: github
  owner: TashiRabten
  repo: GlossarioBUDA

# NEW
publish:
  provider: generic
  url: https://glossariobuda.netlify.app/.netlify/functions/releases
```

Note: You may need to write a custom update provider since `electron-updater` expects specific formats.

### Custom Auto-Update Logic

If you've built custom auto-update logic, just change the URL constant:

```javascript
// config.js or constants.js
export const RELEASES_API_URL = 'https://glossariobuda.netlify.app/.netlify/functions/releases';
```

## Testing the Update

### 1. Test the API Endpoint

Open this URL in your browser:
```
https://glossariobuda.netlify.app/.netlify/functions/releases
```

You should see JSON with your releases.

### 2. Test from Your App

Add a manual "Check for Updates" button in your app's settings that calls `checkForUpdates()`.

### 3. Test Download

Click a download link to ensure it properly downloads through the Netlify proxy.

## API Response Format

The Netlify API returns the exact same format as GitHub's API:

```json
[
  {
    "id": 123456,
    "tag_name": "v1.0.0",
    "name": "Version 1.0.0",
    "body": "Release notes...",
    "published_at": "2025-01-15T10:30:00Z",
    "prerelease": false,
    "assets": [
      {
        "id": 789012,
        "name": "GlossarioBUDA-1.0.0.exe",
        "size": 52428800,
        "browser_download_url": "https://glossariobuda.netlify.app/.netlify/functions/download-asset?...",
        "download_count": 42
      }
    ]
  }
]
```

## Backwards Compatibility

If you want to support both old and new versions of your app:

```javascript
const UPDATE_URLS = [
  'https://glossariobuda.netlify.app/.netlify/functions/releases', // Try Netlify first
  'https://api.github.com/repos/TashiRabten/GlossarioBUDA/releases' // Fallback to GitHub
];

async function checkForUpdates() {
  for (const url of UPDATE_URLS) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.log(`Failed to check ${url}, trying next...`);
    }
  }
  throw new Error('All update sources failed');
}
```

## Questions?

If you run into issues:
1. Check browser/app console for errors
2. Verify the Netlify URL is accessible
3. Ensure your app isn't caching the old GitHub URL
4. Test the endpoint manually with `curl` or browser
