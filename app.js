/**
 * TradutorBUDA download page.
 *
 * Renders a curated downloads experience on top of the GlossarioBUDA GitHub
 * releases (fetched via the secure Netlify backend): the main Java-only app
 * installer, plus the tiered, additive SegBUDA model bundles.
 *
 * The bundle definitions below mirror installer/segbuda/bundles.json in the
 * TradutorBUDA repo — keep them in sync when bundles change.
 */

const API = '/.netlify/functions/get-releases';

// Mirrors installer/segbuda/bundles.json (TradutorBUDA repo).
const BUNDLES = [
    {
        id: 'essential',
        name: 'Essencial',
        badge: { cls: 'req', text: 'Necessário' },
        available: true,
        requires: null,
        sizeMb: 556,
        summary: 'O mínimo para traduzir: ranqueamento de traduções e segmentação de palavras tibetanas.',
        models: ['Ranqueamento de traduções (NLLB)', 'Segmentação de palavras tibetanas'],
    },
    {
        id: 'segmentation',
        name: 'Segmentação',
        badge: { cls: 'add', text: 'Complemento' },
        available: true,
        requires: 'Essencial',
        sizeMb: 826,
        summary: 'Análise avançada: segmentação de sânscrito e morfologia tibetana (caso / partículas).',
        models: ['Segmentador de sânscrito (sandhi)', 'Morfologia tibetana (UPOS / caso)'],
    },
    {
        id: 'audio',
        name: 'Áudio',
        badge: { cls: 'soon', text: 'Em breve' },
        available: false,
        requires: 'Essencial',
        sizeMb: 2327,
        summary: 'Transcrição de fala e geração de legendas. Ainda não disponível.',
        models: ['Reconhecimento de fala (Whisper)', 'Legendas tibetano→inglês (NLLB)'],
    },
];

// Apps published on the GlossarioBUDA releases (discovered by filename token).
const APPS = [
    { id: 'tradutorbuda', name: 'TradutorBUDA', match: 'tradutorbuda', exclude: 'segbuda', primary: true,
      summary: 'Tradutor de tibetano com IA — dicionário, OCR e traduções ranqueadas.' },
    { id: 'glossario', name: 'GlossárioBUDA', match: 'glossario', exclude: 'segbuda',
      summary: 'Glossário e gerenciador de termos budistas multilíngue.' },
    { id: 'namsel', name: 'Namsel OCR', match: 'namsel', exclude: null,
      summary: 'Motor de OCR tibetano local (opcional — o TradutorBUDA usa OCR remoto por padrão).' },
];

const OS = detectOS();

function detectOS() {
    const p = ((navigator.userAgentData && navigator.userAgentData.platform) ||
        navigator.platform || navigator.userAgent || '').toLowerCase();
    if (p.includes('win')) return 'windows';
    if (p.includes('mac') || p.includes('iphone') || p.includes('ipad')) return 'mac';
    return 'unknown';
}

function fmtSize(mb) {
    return mb >= 1024 ? (mb / 1024).toFixed(mb >= 10240 ? 0 : 1) + ' GB' : Math.round(mb) + ' MB';
}

/** Fetch every release asset, newest-first, each tagged with its release name. */
async function collectAssets() {
    const res = await fetch(API);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const repos = await res.json();
    const assets = [];
    for (const repo of repos || []) {
        for (const rel of repo.releases || []) {
            for (const a of rel.assets || []) {
                assets.push({
                    name: a.name,
                    lower: (a.name || '').toLowerCase(),
                    url: a.browser_download_url,
                    size: a.size,
                    tag: rel.tag_name,
                    published: rel.published_at,
                });
            }
        }
    }
    return assets;
}

const EXT = { windows: '.exe', mac: '.pkg' };

/** Newest installer asset for an app (by filename token) on a platform. */
function findInstaller(assets, app, os) {
    const ext = EXT[os];
    return assets.find(a => a.lower.endsWith(ext) && a.lower.includes(app.match)
        && (!app.exclude || !a.lower.includes(app.exclude)));
}

/** Newest installer asset for a given bundle + platform. */
function findBundle(assets, bundleId, os) {
    const ext = EXT[os];
    return assets.find(a => a.lower.endsWith(ext) && a.lower.includes('segbuda') && a.lower.includes(bundleId));
}

function osLabel(os) { return os === 'windows' ? 'Windows' : 'Mac'; }
// Portable emoji — the Apple brand glyph renders only on Apple devices and shows
// as tofu (square) on Windows/Linux. 🪟 / 🍎 render everywhere.
function osIcon(os) { return os === 'windows' ? '🪟' : '🍎'; }

/** A download button (or a disabled placeholder when the asset is missing). */
function button(asset, os, { secondary = false, recommended = false } = {}) {
    const cls = ['dl'];
    if (secondary) cls.push('secondary');
    if (recommended) cls.push('recommended');
    const label = `${osLabel(os)}`;
    if (!asset) {
        return `<a class="${cls.join(' ')}" aria-disabled="true" title="Ainda não publicado">
                  <span class="os">${osIcon(os)}</span> ${label} · indisponível</a>`;
    }
    return `<a class="${cls.join(' ')}" href="${asset.url}">
              <span class="os">${osIcon(os)}</span> ${label}</a>`;
}

function renderApps(assets) {
    const el = document.getElementById('apps');
    el.innerHTML = APPS.map(a => {
        const win = findInstaller(assets, a, 'windows');
        const mac = findInstaller(assets, a, 'mac');
        const winFirst = OS !== 'mac';
        const w = button(win, 'windows', { secondary: !winFirst, recommended: a.primary && OS === 'windows' });
        const m = button(mac, 'mac', { secondary: winFirst, recommended: a.primary && OS === 'mac' });
        const ref = OS === 'mac' ? mac : win;
        const ver = ref && ref.tag
            ? `<div class="meta">Versão ${ref.tag.replace(/^[a-zA-Z-]*v?/, 'v')}</div>` : '';
        return `
            <div class="bundle app">
                <div class="top">
                    <h3>${a.name}</h3>
                    ${a.primary ? '<span class="badge add">Principal</span>' : ''}
                </div>
                <div class="summary">${a.summary}</div>
                ${ver}
                <div class="actions">${winFirst ? w + m : m + w}</div>
            </div>`;
    }).join('');
}

function renderBundles(assets) {
    const el = document.getElementById('bundles');
    el.innerHTML = BUNDLES.map(b => {
        const win = b.available ? findBundle(assets, b.id, 'windows') : null;
        const mac = b.available ? findBundle(assets, b.id, 'mac') : null;
        const models = b.models.map(m => `<li>${m}</li>`).join('');
        const requires = b.requires
            ? `<div class="meta">Requer: <b>${b.requires}</b></div>` : '';
        let actions;
        if (!b.available) {
            actions = `<a class="dl" aria-disabled="true">Em breve</a>`;
        } else {
            const winFirst = OS !== 'mac';
            const w = button(win, 'windows', { secondary: !winFirst });
            const m = button(mac, 'mac', { secondary: winFirst });
            actions = winFirst ? w + m : m + w;
        }
        return `
            <div class="bundle ${b.available ? '' : 'soon'}">
                <div class="top">
                    <h3>${b.name}</h3>
                    <span class="badge ${b.badge.cls}">${b.badge.text}</span>
                </div>
                <div class="summary">${b.summary}</div>
                <div class="meta"><b>~${fmtSize(b.sizeMb)}</b> para baixar</div>
                ${requires}
                <ul class="models">${models}</ul>
                <div class="actions">${actions}</div>
            </div>`;
    }).join('');
}

async function load() {
    try {
        const assets = await collectAssets();
        renderApps(assets);
        renderBundles(assets);
    } catch (e) {
        console.error(e);
        const msg = `<div class="err">Não foi possível carregar os downloads: ${e.message}</div>`;
        document.getElementById('apps').innerHTML = msg;
        document.getElementById('bundles').innerHTML = '';
    }
}

document.addEventListener('DOMContentLoaded', load);
