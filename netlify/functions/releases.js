/**
 * Netlify Function: GitHub-Compatible Releases API
 * Returns releases in the same format as GitHub API for app auto-update compatibility
 *
 * This endpoint mimics: GET /repos/:owner/:repo/releases
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

/**
 * Compare two parsed version arrays descending (highest version first).
 * null versions sort after all real versions.
 */
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

/**
 * Sort rank for a macOS .pkg asset, used to order assets so LEGACY desktop
 * updaters (which pick the FIRST .pkg and send no CPU-arch signal) land on the
 * most broadly-runnable build:
 *   0 = x86_64  -> runs on every Mac (native on Intel, Rosetta 2 on Apple Silicon)
 *   1 = untagged/unknown
 *   2 = arm64   -> Apple Silicon ONLY (won't launch on Intel)
 * Returns null for non-.pkg assets so they keep their original relative order.
 * Arch-aware clients (the new updater + the website) match by filename token
 * regardless of order, so this reordering only affects legacy updaters.
 */
function pkgRank(name) {
    const n = (name || '').toLowerCase();
    if (!n.endsWith('.pkg')) return null;
    if (/(x86_64|x64|amd64|intel)/.test(n)) return 0;
    if (/(arm64|aarch64)/.test(n)) return 2;
    return 1;
}

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

        // Hardcoded to GlossarioBUDA repo (main app)
        const owner = 'TashiRabten';
        const repo = 'GlossarioBUDA';

        const url = `https://api.github.com/repos/${owner}/${repo}/releases`;
        const response = await fetch(url, {
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'GlossarioBUDA-Updater'
            }
        });

        if (!response.ok) {
            console.error(`Failed to fetch releases: ${response.status}`);
            return {
                statusCode: response.status,
                headers,
                body: JSON.stringify({
                    message: `Failed to fetch releases: ${response.statusText}`
                })
            };
        }

        const releases = await response.json();

        // Transform download URLs to go through our proxy
        // The proxy handles GitHub authentication and returns download URLs
        const transformedReleases = releases.map(release => {
            const assets = release.assets.map(asset => {
                // Create proxy URL for downloads
                const proxyUrl = `https://glossariobudacompact.netlify.app/.netlify/functions/download-asset?owner=${owner}&repo=${repo}&assetId=${asset.id}&filename=${encodeURIComponent(asset.name)}`;

                return {
                    ...asset,
                    // Use proxy URL - works for both browser (redirect) and desktop app (JSON)
                    browser_download_url: proxyUrl,
                    // Store original GitHub API URL for reference
                    github_url: asset.url
                };
            });

            // Order .pkg assets so legacy updaters (first-.pkg, no arch signal) land
            // on the broadly-runnable x86_64 build before the Apple-Silicon-only arm64
            // one. Stable sort: non-.pkg pairs compare equal and keep their order.
            assets.sort((a, b) => {
                const ra = pkgRank(a.name), rb = pkgRank(b.name);
                if (ra === null || rb === null) return 0;
                return ra - rb;
            });

            return { ...release, assets };
        });

        // Sort by semantic version descending so each AutoUpdater (which picks the
        // FIRST release matching its branch) always receives the highest version
        // first — regardless of when the GitHub tag was created (created_at order).
        transformedReleases.sort((a, b) =>
            compareVersionsDesc(parseVersionFromTag(a.tag_name), parseVersionFromTag(b.tag_name))
        );

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(transformedReleases)
        };

    } catch (error) {
        console.error('Error in releases function:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                message: 'Internal server error',
                error: error.message
            })
        };
    }
};
