/**
 * Netlify Function: GitHub-Compatible Releases API
 * Returns releases in the same format as GitHub API for app auto-update compatibility
 *
 * This endpoint mimics: GET /repos/:owner/:repo/releases
 */

const fetch = require('node-fetch');

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
            return {
                ...release,
                assets: release.assets.map(asset => {
                    // Create proxy URL for downloads
                    const proxyUrl = `https://glossariobudacompact.netlify.app/.netlify/functions/download-asset?owner=${owner}&repo=${repo}&assetId=${asset.id}&filename=${encodeURIComponent(asset.name)}`;

                    return {
                        ...asset,
                        // Use proxy URL - works for both browser (redirect) and desktop app (JSON)
                        browser_download_url: proxyUrl,
                        // Store original GitHub API URL for reference
                        github_url: asset.url
                    };
                })
            };
        });

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
