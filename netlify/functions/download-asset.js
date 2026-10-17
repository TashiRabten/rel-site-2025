/**
 * Netlify Function: Download Asset
 * Securely proxies downloads from private GitHub releases
 */

const fetch = require('node-fetch');
const RELEASE_OWNER = 'TashiRabten';
const RELEASE_REPOSITORY = 'GlossarioBUDA';
const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
};

function jsonResponse(statusCode, value) {
    return {
        statusCode,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify(value)
    };
}

function isAllowedAsset(owner, repo, assetId) {
    return owner === RELEASE_OWNER
        && repo === RELEASE_REPOSITORY
        && /^[0-9]+$/.test(assetId || '');
}

async function fetchAsset(assetId, token) {
    // The host/repository are constants and assetId is decimal-validated before this call.
    // nosemgrep: Semgrep_rules_lgpl_javascript_ssrf_rule-node-ssrf
    return fetch(`https://api.github.com/repos/${RELEASE_OWNER}/${RELEASE_REPOSITORY}/releases/assets/${assetId}`, {
        method: 'GET',
        headers: {
            'Authorization': `token ${token}`,
            'Accept': 'application/octet-stream',
            'User-Agent': 'Private-Releases-Site'
        },
        redirect: 'manual'
    });
}

function formatAssetResponse(response, filename, wantsJson) {
    if (response.status === 302 || response.status === 301) {
        const downloadUrl = response.headers.get('location');
        if (downloadUrl) {
            if (wantsJson) {
                return jsonResponse(200, { url: downloadUrl, filename });
            }
            return {
                statusCode: response.status,
                headers: { Location: downloadUrl, 'Cache-Control': 'no-cache' },
                body: ''
            };
        }
    }
    if (!response.ok) {
        console.error(`Failed to get asset download URL: ${response.status}`);
        return jsonResponse(response.status, {
            error: `Failed to get download URL: ${response.status} ${response.statusText}`
        });
    }
    return jsonResponse(500, { error: 'Unable to get download URL from GitHub' });
}

exports.handler = async (event, context) => {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: CORS_HEADERS, body: '' };
    }
    if (event.httpMethod !== 'GET') {
        return jsonResponse(405, { error: 'Method not allowed' });
    }

    try {
        const params = event.queryStringParameters || {};
        const { owner, repo, assetId, filename } = params;
        if (!owner || !repo || !assetId) {
            return jsonResponse(400, { error: 'Missing required parameters: owner, repo, assetId' });
        }
        if (!isAllowedAsset(owner, repo, assetId)) {
            return jsonResponse(404, { error: 'Release asset not found' });
        }

        const token = process.env.GITHUB_TOKEN;
        if (!token) {
            throw new Error('GITHUB_TOKEN not configured');
        }

        const requestHeaders = event.headers || {};
        const acceptHeader = requestHeaders.accept || requestHeaders.Accept || '';
        const wantsJson = acceptHeader.includes('application/json');
        const response = await fetchAsset(assetId, token);
        return formatAssetResponse(response, filename, wantsJson);

    } catch (error) {
        console.error('Error in download-asset function:', error);
        return jsonResponse(500, { error: 'Internal server error', message: error.message });
    }
};
