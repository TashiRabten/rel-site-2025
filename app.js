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

// Apps discovered by filename token across the configured release repos
// (netlify/functions/get-releases.js REPOSITORIES). Per-arch Mac buttons +
// Windows button render automatically from arch-tagged filenames.
const APPS = [
    { id: 'tradutorbuda', name: 'TradutorBUDA', match: 'tradutorbuda', exclude: 'segbuda', primary: true,
      summary: 'Tradutor de tibetano com IA — dicionário, OCR e traduções ranqueadas.' },
    { id: 'glossario', name: 'GlossárioBUDA', match: 'glossario', exclude: 'segbuda',
      summary: 'Glossário e gerenciador de termos budistas multilíngue.' },
    { id: 'legendasbuda', name: 'LegendasBUDA', match: 'legendasbuda', exclude: null,
      summary: 'Visualizador de legendas para vídeos do YouTube.' },
    { id: 'namsel', name: 'Namsel OCR', match: 'namsel', exclude: null,
      summary: 'Motor de OCR tibetano local (opcional — o TradutorBUDA usa OCR remoto por padrão).' },
];

// The glossary database (~2.4 GB) ships as an INSTALLER (DadosBUDA), not a raw
// file download: it overwrites glossario_terms.db in place inside the canonical
// ~/Documents/glossariobuda folder — a plain download can't replace it there.
// Data-only, so a single .pkg serves both Macs. Discovered by the 'dadosbuda' token.
const DATA = {
    name: 'DadosBUDA',
    match: 'dadosbuda',
    sizeMb: 2400,
    summary: 'Banco de dados do glossário budista. Instala e substitui o glossario_terms.db na pasta glossariobuda — usado pelo TradutorBUDA e pelo GlossárioBUDA.',
};

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

// macOS .pkg files are arch-specific (each bundles its own JRE). When a release
// carries arch-tagged installers, the page offers one button per arch — browsers
// can't reliably read a Mac's CPU, so we show both and let the user pick.
const MAC_ARCHES = [
    { id: 'arm64',  label: 'Apple Silicon', tokens: ['arm64', 'aarch64'] },
    { id: 'x86_64', label: 'Intel',         tokens: ['x86_64', 'x64', 'amd64', 'intel'] },
];

/**
 * Newest installer asset for an app (by filename token) on a platform.
 * When archTokens is given (macOS), the filename must also contain one of them.
 */
function findInstaller(assets, app, os, archTokens) {
    const ext = EXT[os];
    return assets.find(a => a.lower.endsWith(ext) && a.lower.includes(app.match)
        && (!app.exclude || !a.lower.includes(app.exclude))
        && (!archTokens || archTokens.some(t => a.lower.includes(t))));
}

/**
 * Per-arch macOS installers for an app — but only when arch-tagged .pkg files
 * exist on the release. Returns null otherwise so the caller falls back to a
 * single generic Mac button (back-compat with un-tagged .pkg names).
 */
function macInstallers(assets, app) {
    const perArch = MAC_ARCHES.map(arch => ({ arch, asset: findInstaller(assets, app, 'mac', arch.tokens) }));
    return perArch.some(x => x.asset) ? perArch : null;
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
function button(asset, os, { secondary = false, recommended = false, archLabel = null } = {}) {
    const cls = ['dl'];
    if (secondary) cls.push('secondary');
    if (recommended) cls.push('recommended');
    const label = archLabel ? `${osLabel(os)} · ${archLabel}` : `${osLabel(os)}`;
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
        const winFirst = OS !== 'mac';
        const w = button(win, 'windows', { secondary: !winFirst, recommended: a.primary && OS === 'windows' });

        // macOS: one button per arch when arch-tagged .pkg files exist on the
        // release, else a single generic Mac button (back-compat).
        const perArch = macInstallers(assets, a);
        let m, macRef;
        if (perArch) {
            m = perArch.map(({ arch, asset }) =>
                button(asset, 'mac', { secondary: winFirst, archLabel: arch.label })).join('');
            macRef = (perArch.find(x => x.asset) || {}).asset;
        } else {
            const mac = findInstaller(assets, a, 'mac');
            m = button(mac, 'mac', { secondary: winFirst, recommended: a.primary && OS === 'mac' });
            macRef = mac;
        }

        const ref = OS === 'mac' ? macRef : win;
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

/** The glossary-database installer (DadosBUDA) — overwrites the DB in place. */
function findData(assets, os) {
    return assets.find(a => a.lower.endsWith(EXT[os]) && a.lower.includes(DATA.match));
}

function renderData(assets) {
    const el = document.getElementById('data');
    if (!el) return;
    const win = findData(assets, 'windows');
    const mac = findData(assets, 'mac');
    const winFirst = OS !== 'mac';
    const w = button(win, 'windows', { secondary: !winFirst });
    const m = button(mac, 'mac', { secondary: winFirst });
    const ref = OS === 'mac' ? mac : win;
    const ver = ref && ref.tag
        ? `<div class="meta">Versão ${ref.tag.replace(/^[a-zA-Z-]*v?/, 'v')}</div>` : '';
    el.innerHTML = `
        <div class="bundle">
            <div class="top">
                <h3>${DATA.name}</h3>
                <span class="badge req">Necessário</span>
            </div>
            <div class="summary">${DATA.summary}</div>
            <div class="meta"><b>~${fmtSize(DATA.sizeMb)}</b> para baixar</div>
            <div class="meta">Substitui o banco em <b>Documentos/glossariobuda</b></div>
            ${ver}
            <div class="actions">${winFirst ? w + m : m + w}</div>
        </div>`;
}

async function load() {
    try {
        const assets = await collectAssets();
        renderApps(assets);
        renderData(assets);
        renderBundles(assets);
    } catch (e) {
        console.error(e);
        const msg = `<div class="err">Não foi possível carregar os downloads: ${e.message}</div>`;
        document.getElementById('apps').innerHTML = msg;
        const dataEl = document.getElementById('data'); if (dataEl) dataEl.innerHTML = '';
        document.getElementById('bundles').innerHTML = '';
    }
}

document.addEventListener('DOMContentLoaded', load);
