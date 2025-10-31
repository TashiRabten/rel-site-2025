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

        // Fetch the asset from GitHub
        const url = `https://api.github.com/repos/${owner}/${repo}/releases/assets/${assetId}`;
        const response = await fetch(url, {
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/octet-stream',
                'User-Agent': 'Private-Releases-Site'
            }
        });

        if (!response.ok) {
            console.error(`Failed to download asset: ${response.status}`);
            return {
                statusCode: response.status,
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    error: `Failed to download asset: ${response.status} ${response.statusText}`
                })
            };
        }

        // Get the content type and buffer
        const contentType = response.headers.get('content-type') || 'application/octet-stream';
        const buffer = await response.buffer();

        // Return the file as base64 for binary data
        return {
            statusCode: 200,
            headers: {
                ...headers,
                'Content-Type': contentType,
                'Content-Disposition': `attachment; filename="${filename || 'download'}"`,
                'Content-Length': buffer.length.toString()
            },
            body: buffer.toString('base64'),
            isBase64Encoded: true
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
