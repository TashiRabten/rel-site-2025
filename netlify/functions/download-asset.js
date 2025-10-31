/**
 * Netlify Function: Download Asset
 * Securely proxies downloads from private GitHub releases
 */

const fetch = require('node-fetch');

exports.handler = async (event, context) => {
    // Enable CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
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
        // Get parameters from query string
        const params = event.queryStringParameters || {};
        const { owner, repo, assetId, filename } = params;

        if (!owner || !repo || !assetId) {
            return {
                statusCode: 400,
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'Missing required parameters: owner, repo, assetId' })
            };
        }

        // Get token from environment variable
        const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

        if (!GITHUB_TOKEN) {
            throw new Error('GITHUB_TOKEN not configured');
        }

        // Fetch the asset metadata from GitHub to get the download URL
        const url = `https://api.github.com/repos/${owner}/${repo}/releases/assets/${assetId}`;
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/octet-stream',
                'User-Agent': 'Private-Releases-Site'
            },
            redirect: 'manual'  // Don't follow redirects automatically
        });

        // GitHub returns a 302 redirect to the actual download URL (S3)
        if (response.status === 302 || response.status === 301) {
            const downloadUrl = response.headers.get('location');
            if (downloadUrl) {
                // Redirect the user to the temporary download URL
                return {
                    statusCode: 302,
                    headers: {
                        'Location': downloadUrl,
                        'Cache-Control': 'no-cache'
                    },
                    body: ''
                };
            }
        }

        if (!response.ok) {
            console.error(`Failed to get asset download URL: ${response.status}`);
            return {
                statusCode: response.status,
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    error: `Failed to get download URL: ${response.status} ${response.statusText}`
                })
            };
        }

        // Fallback: if no redirect, something went wrong
        return {
            statusCode: 500,
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                error: 'Unable to get download URL from GitHub'
            })
        };

    } catch (error) {
        console.error('Error in download-asset function:', error);
        return {
            statusCode: 500,
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                error: 'Internal server error',
                message: error.message
            })
        };
    }
};
