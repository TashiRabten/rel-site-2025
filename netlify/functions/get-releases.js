/**
 * Netlify Function: Get Releases
 * Securely fetches releases from private GitHub repositories
 */

const fetch = require('node-fetch');

// Configure your repositories here
const REPOSITORIES = [
    { owner: 'TashiRabten', repo: 'GlossarioBUDA' },
    // Add more repositories like:
    // { owner: 'YourUsername', repo: 'AnotherRepo' },
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
                    return { owner, repo, releases, error: null };

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
