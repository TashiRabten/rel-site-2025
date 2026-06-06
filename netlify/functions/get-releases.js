/**
 * Netlify Function: Get Releases
 * Securely fetches releases from private GitHub repositories
 */

const fetch = require('node-fetch');

/**
 * Parse a semantic version from a release tag, stripping any app prefix.
 * Handles: "glossario-v1.4.0", "tradutor-buda-v1.4.8", "namsel-v1.0.0.5",
 *          "segbuda-v1.2.0", "dadosbuda-v1.0.1", "v1.3.9", "v.1.3.3".
 * Returns an array of integers, or null if unparseable (sorts last).
 */
function parseVersionFromTag(tag) {
    if (!tag) return null;
    const stripped = tag.replace(/^[^0-9]+/, '');
    if (!stripped) return null;
    const parts = stripped.split('.').map(Number);
    return parts.some(isNaN) ? null : parts;
}

function compareVersionsDesc(a, b) {
    if (!a && !b) return 0;
    if (!a) return 1;
    if (!b) return -1;
    const len = Math.max(a.length, b.length);
    for (let i = 0; i < len; i++) {
        const diff = (b[i] || 0) - (a[i] || 0);
        if (diff !== 0) return diff;
    }
    return 0;
}

// Configure your repositories here. Assets from every repo are merged client-side
// and matched by filename token (app.js APPS/BUNDLES), so an app can live in its own
// repo. LegendasBUDA publishes to its own repo (matching its in-app AutoUpdater).
const REPOSITORIES = [
    { owner: 'TashiRabten', repo: 'GlossarioBUDA' },
    { owner: 'TashiRabten', repo: 'LegendasBUDA' },
];

exports.handler = async (event, context) => {
    // Enable CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Content-Type': 'application/json'
    };

    // Handle preflight request
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    // Only allow GET requests
    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        // Get token from environment variable
        const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

        if (!GITHUB_TOKEN) {
            throw new Error('GITHUB_TOKEN not configured');
        }

        // Fetch releases from all repositories
        const allReleases = await Promise.all(
            REPOSITORIES.map(async ({ owner, repo }) => {
                try {
                    const url = `https://api.github.com/repos/${owner}/${repo}/releases`;
                    const response = await fetch(url, {
                        headers: {
                            'Authorization': `token ${GITHUB_TOKEN}`,
                            'Accept': 'application/vnd.github.v3+json',
                            'User-Agent': 'Private-Releases-Site'
                        }
                    });

                    if (!response.ok) {
                        console.error(`Failed to fetch ${owner}/${repo}: ${response.status}`);
                        return {
                            owner,
                            repo,
                            releases: [],
                            error: `HTTP ${response.status}: ${response.statusText}`
                        };
                    }

                    const releases = await response.json();

                    // Transform download URLs to use proxy for private repo access
                    const transformedReleases = releases.map(release => ({
                        ...release,
                        assets: release.assets.map(asset => ({
                            ...asset,
                            // Store original for reference
                            original_browser_download_url: asset.browser_download_url,
                            // Use proxy URL for downloads through our backend
                            browser_download_url: `https://glossariobudacompact.netlify.app/.netlify/functions/download-asset?owner=${owner}&repo=${repo}&assetId=${asset.id}&filename=${encodeURIComponent(asset.name)}`
                        }))
                    }));

                    // Sort by semantic version descending so findInstaller (which picks
                    // the first matching asset) always gets the highest-version release
                    // regardless of when the GitHub tag was originally created.
                    transformedReleases.sort((a, b) =>
                        compareVersionsDesc(parseVersionFromTag(a.tag_name), parseVersionFromTag(b.tag_name))
                    );

                    return { owner, repo, releases: transformedReleases, error: null };

                } catch (error) {
                    console.error(`Error fetching ${owner}/${repo}:`, error);
                    return {
                        owner,
                        repo,
                        releases: [],
                        error: error.message
                    };
                }
            })
        );

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(allReleases)
        };

    } catch (error) {
        console.error('Error in get-releases function:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Internal server error',
                message: error.message
            })
        };
    }
};
