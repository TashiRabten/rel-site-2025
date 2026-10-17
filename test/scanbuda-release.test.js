const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');

function loadFunction(file, fakeFetch, token = 'configured-in-test') {
    const module = { exports: {} };
    const sandbox = {
        exports: module.exports,
        module,
        process: { env: { GITHUB_TOKEN: token } },
        require: name => name === 'node-fetch' ? fakeFetch : require(name),
        console: { error() {} },
    };
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    vm.runInNewContext(source, sandbox, { filename: file });
    return module.exports.handler;
}

function loadReleaseFunction(file, githubReleases) {
    const fakeFetch = async () => ({ ok: true, json: async () => githubReleases });
    return loadFunction(file, fakeFetch);
}

function loadPage(releases) {
    const apps = { innerHTML: '' };
    const document = {
        addEventListener() {},
        getElementById(id) { return id === 'apps' ? apps : { innerHTML: '' }; },
    };
    const sandbox = {
        navigator: { userAgentData: { platform: 'Windows' }, platform: 'Win32' },
        document,
        fetch: async () => ({ ok: true, json: async () => releases }),
        console,
    };
    const source = fs.readFileSync(path.join(root, 'safe-html.js'), 'utf8')
        + '\n' + fs.readFileSync(path.join(root, 'app.js'), 'utf8')
        + '\nglobalThis.testApi = { collectAssets, renderApps };';
    vm.runInNewContext(source, sandbox, { filename: 'app.js' });
    return { api: sandbox.testApi, apps };
}

test('ScanBUDA release is exposed as a Windows download on the site', async () => {
    const githubReleases = [{
        id: 100,
        tag_name: 'scanbuda-v0.1.0<img>',
        name: 'ScanBUDA 0.1.0',
        body: 'Primeiro instalador.',
        published_at: '2026-10-17T12:00:00Z',
        draft: false,
        prerelease: false,
        assets: [{
            id: 42,
            name: 'ScanBUDA-0.1.0.exe',
            size: 1234,
            browser_download_url: 'https://github.com/TashiRabten/GlossarioBUDA/releases/download/scanbuda-v0.1.0/ScanBUDA-0.1.0.exe',
        }],
    }];
    const getReleases = loadReleaseFunction('netlify/functions/get-releases.js', githubReleases);
    const response = await getReleases({ httpMethod: 'GET' }, {});
    assert.equal(response.statusCode, 200);

    const page = loadPage(JSON.parse(response.body));
    const assets = await page.api.collectAssets();
    page.api.renderApps(assets);

    assert.match(page.apps.innerHTML, /<h3>ScanBUDA<\/h3>/);
    assert.match(page.apps.innerHTML, /Scanner de PDFs no formato do GlossárioBUDA/);
    assert.match(page.apps.innerHTML, /ScanBUDA-0\.1\.0\.exe/);
    assert.match(page.apps.innerHTML, /v0\.1\.0&lt;img&gt;/);
    assert.doesNotMatch(page.apps.innerHTML, /<img>/);
    assert.match(page.apps.innerHTML, /\.netlify\.app\/.netlify\/functions\/download-asset\?owner=TashiRabten&amp;repo=GlossarioBUDA&amp;assetId=42/);
});

test('download proxy cannot use its GitHub token for another repository', async () => {
    let requestedUrl = null;
    const fakeFetch = async url => {
        requestedUrl = url;
        return {
            status: 302,
            ok: false,
            headers: { get: () => 'https://downloads.example/asset' },
        };
    };
    const handler = loadFunction('netlify/functions/download-asset.js', fakeFetch);
    const baseEvent = {
        httpMethod: 'GET',
        headers: { accept: 'text/html' },
        queryStringParameters: {
            owner: 'TashiRabten', repo: 'GlossarioBUDA', assetId: '42', filename: 'ScanBUDA-0.1.0.exe',
        },
    };

    const response = await handler(baseEvent, {});
    assert.equal(response.statusCode, 302);
    assert.equal(requestedUrl, 'https://api.github.com/repos/TashiRabten/GlossarioBUDA/releases/assets/42');

    requestedUrl = null;
    const rejected = await handler({
        ...baseEvent,
        queryStringParameters: { ...baseEvent.queryStringParameters, repo: 'OtherPrivateRepository' },
    }, {});
    assert.equal(rejected.statusCode, 404);
    assert.equal(requestedUrl, null);

    const invalidId = await handler({
        ...baseEvent,
        queryStringParameters: { ...baseEvent.queryStringParameters, assetId: '42/other' },
    }, {});
    assert.equal(invalidId.statusCode, 404);
    assert.equal(requestedUrl, null);
});
