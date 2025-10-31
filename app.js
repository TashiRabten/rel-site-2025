/**
 * Private Repository Releases Viewer
 * Author: Tashi Rabten
 *
 * This application fetches and displays releases from your private GitHub repositories
 * Now uses secure backend API - no tokens exposed in frontend!
 */

// API endpoint for fetching releases (calls your secure backend)
const API_BASE = '/.netlify/functions';

/**
 * Format file size to human-readable format
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Format date to readable format
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

/**
 * Get file icon based on extension
 */
function getFileIcon(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const icons = {
        'zip': '📦',
        'tar': '📦',
        'gz': '📦',
        'exe': '💿',
        'dmg': '💿',
        'pkg': '💿',
        'deb': '💿',
        'rpm': '💿',
        'apk': '📱',
        'jar': '☕',
        'pdf': '📄',
        'txt': '📝',
        'md': '📝',
    };
    return icons[ext] || '📎';
}

/**
 * Fetch all releases from the backend
 */
async function fetchAllReleases() {
    const url = `${API_BASE}/get-releases`;

    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Failed to fetch releases: ${response.status} ${response.statusText}`);
        }

        const allReleases = await response.json();
        return allReleases;
    } catch (error) {
        console.error('Error fetching releases:', error);
        throw error;
    }
}

/**
 * Download a private asset via backend proxy
 */
async function downloadAsset(owner, repo, assetId, filename) {
    const url = `${API_BASE}/download-asset?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}&assetId=${encodeURIComponent(assetId)}&filename=${encodeURIComponent(filename)}`;

    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Download failed: ${response.status}`);
        }

        // Create a blob from the response
        const blob = await response.blob();

        // Create a temporary URL and trigger download
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
        console.error('Download error:', error);
        alert(`Failed to download ${filename}: ${error.message}`);
    }
}

/**
 * Render a single release
 */
function renderRelease(release, owner, repo) {
    const hasAssets = release.assets && release.assets.length > 0;

    return `
        <div class="release">
            <div class="release-header">
                <div class="release-title">
                    <h3>${release.name || release.tag_name}</h3>
                    <div class="release-meta">
                        <span class="tag">${release.tag_name}</span>
                        <span class="date">📅 ${formatDate(release.published_at)}</span>
                        ${release.prerelease ? '<span class="tag" style="background: #f59e0b;">Pre-release</span>' : ''}
                        ${release.draft ? '<span class="tag" style="background: #6b7280;">Draft</span>' : ''}
                    </div>
                </div>
            </div>

            ${release.body ? `<div class="release-body">${release.body}</div>` : ''}

            ${hasAssets ? `
                <div class="assets">
                    <div class="assets-title">📥 Downloads (${release.assets.length})</div>
                    ${release.assets.map(asset => `
                        <div class="asset">
                            <div class="asset-info">
                                <span class="asset-icon">${getFileIcon(asset.name)}</span>
                                <div>
                                    <div class="asset-name">${asset.name}</div>
                                    <div class="asset-size">${formatFileSize(asset.size)} • ${asset.download_count} downloads</div>
                                </div>
                            </div>
                            <a href="#"
                               class="download-btn"
                               onclick="downloadAsset('${owner}', '${repo}', ${asset.id}, '${asset.name}'); return false;">
                                Download
                            </a>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
        </div>
    `;
}

/**
 * Render all releases for a repository
 */
function renderRepository(repoData) {
    const { owner, repo, releases, error } = repoData;

    if (error) {
        return `
            <div class="repo-section">
                <div class="repo-header">
                    <div class="repo-icon">⚠️</div>
                    <div class="repo-info">
                        <h2>${owner}/${repo}</h2>
                        <p>Error loading releases</p>
                    </div>
                </div>
                <div class="error">
                    ${error}
                </div>
            </div>
        `;
    }

    if (releases.length === 0) {
        return `
            <div class="repo-section">
                <div class="repo-header">
                    <div class="repo-icon">📦</div>
                    <div class="repo-info">
                        <h2>${owner}/${repo}</h2>
                        <p>Private Repository</p>
                    </div>
                </div>
                <div class="no-releases">
                    No releases found for this repository
                </div>
            </div>
        `;
    }

    return `
        <div class="repo-section">
            <div class="repo-header">
                <div class="repo-icon">📦</div>
                <div class="repo-info">
                    <h2>${owner}/${repo}</h2>
                    <p>${releases.length} release${releases.length !== 1 ? 's' : ''} available</p>
                </div>
            </div>
            ${releases.map(release => renderRelease(release, owner, repo)).join('')}
        </div>
    `;
}

/**
 * Main function to load and display all releases
 */
async function loadAllReleases() {
    const contentDiv = document.getElementById('content');

    try {
        // Fetch releases from backend
        const allReleases = await fetchAllReleases();

        // Render all repositories
        const html = allReleases.map(renderRepository).join('');
        contentDiv.innerHTML = html || '<div class="no-releases">No repositories configured</div>';

    } catch (error) {
        console.error('Error loading releases:', error);
        contentDiv.innerHTML = `
            <div class="error">
                <h3>Error Loading Releases</h3>
                <p>${error.message}</p>
            </div>
        `;
    }
}

// Make downloadAsset available globally for onclick handlers
window.downloadAsset = downloadAsset;

// Load releases when page loads
document.addEventListener('DOMContentLoaded', loadAllReleases);
