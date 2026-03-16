const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const { nowIso, readJson, writeJson, toNumber } = require('./checks/utils');

loadEnv(path.resolve(__dirname, '.env'));

const PORT = toNumber(process.env.PORT, 3030);
const HOST = process.env.HOST || '0.0.0.0';
const CHECK_INTERVAL_MS = toNumber(process.env.CHECK_INTERVAL_SECONDS, 30) * 1000;
const ANNOUNCEMENTS_FILE = process.env.ANNOUNCEMENTS_FILE || './data/announcements.json';
const HISTORY_FILE = process.env.HISTORY_FILE || './data/history.json';
const SETTINGS_FILE = process.env.SETTINGS_FILE || './data/settings.json';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '1234';
const CAMPUSES_FILE = './config/campuses.json';
const SERVICES_FILE = './config/services.json';
const PLUGINS_FILE = './config/plugins.json';

const defaultSettings = {
  brandName: 'SchoolPulse',
  subtitle: 'District IT Status',
  accent: '#f97316',
  accent2: '#fb7185',
  surface: '#ffffff',
  surfaceTint: '#f8fafc',
  text: '#0f172a',
  muted: '#64748b',
  bg1: '#eef2ff',
  bg2: '#f8fafc',
  bg3: '#ffe4e6',
  logoDataUrl: '',
  logoShape: 'rounded',
  compactCards: false
};

let state = {
  generatedAt: null,
  overallStatus: 'yellow',
  overallHealth: 84,
  services: [],
  incidents: [],
  summary: { green: 0, yellow: 0, red: 0 },
  campuses: [],
  campusStates: {},
  displayTargets: ['front office TVs', 'principal dashboards', 'internal webpage'],
  pluginSummaries: []
};

async function runChecks() {
  const campusDefs = readJson(CAMPUSES_FILE, []);
  const serviceDefs = readJson(SERVICES_FILE, { services: [] }).services || [];
  const pluginDefs = readJson(PLUGINS_FILE, { plugins: [] }).plugins || [];
  const serviceMap = Object.fromEntries(serviceDefs.map((s) => [s.id, s]));

  const loadedPlugins = pluginDefs
    .filter((p) => p.enabled !== false)
    .map((p) => ({ ...p, module: require(path.resolve(__dirname, p.path)) }))
    .filter((p) => typeof p.module.run === 'function');

  const services = [];
  for (const plugin of loadedPlugins) {
    const serviceDef = serviceMap[plugin.id] || {};
    try {
      const result = await plugin.module.run(process.env, serviceDef);
      services.push({
        ...result,
        id: result.id || plugin.id,
        name: result.name || plugin.name || plugin.id,
        campuses: serviceDef.campuses || plugin.campuses || ['district'],
        category: serviceDef.category || plugin.category || 'service',
        pluginName: plugin.name || plugin.id
      });
    } catch (error) {
      services.push({
        id: plugin.id,
        name: plugin.name || plugin.id,
        status: 'red',
        detail: `${plugin.name || plugin.id} check failed.`,
        campuses: serviceDef.campuses || plugin.campuses || ['district'],
        category: serviceDef.category || plugin.category || 'service',
        pluginName: plugin.name || plugin.id,
        meta: { error: error.message }
      });
    }
  }

  const summary = summarize(services);
  const overallStatus = deriveOverallStatus(summary);
  const overallHealth = computeHealthScore(services);
  const history = readJson(HISTORY_FILE, []);
  const incidents = detectIncidents(services, history, campusDefs);
  const campusStates = buildCampusStates(campusDefs, services);

  state = {
    generatedAt: nowIso(),
    overallStatus,
    overallHealth,
    services,
    incidents,
    summary,
    campuses: campusDefs,
    campusStates,
    displayTargets: ['front office TVs', 'principal dashboards', 'internal webpage'],
    pluginSummaries: loadedPlugins.map((p) => ({ id: p.id, name: p.name || p.id, version: p.version || '1.0.0' }))
  };

  history.push({
    generatedAt: state.generatedAt,
    overallStatus,
    overallHealth,
    services: services.map((svc) => ({
      id: svc.id,
      name: svc.name,
      status: svc.status,
      campuses: svc.campuses,
      meta: svc.meta || {}
    }))
  });
  writeJson(HISTORY_FILE, history.slice(-800));
}

function summarize(services) {
  const summary = { green: 0, yellow: 0, red: 0 };
  for (const svc of services) summary[svc.status] = (summary[svc.status] || 0) + 1;
  return summary;
}

function deriveOverallStatus(summary) {
  return summary.red > 0 ? 'red' : summary.yellow > 0 ? 'yellow' : 'green';
}

function computeHealthScore(services) {
  if (!services.length) return 0;
  const weights = { green: 100, yellow: 70, red: 35 };
  const raw = services.reduce((sum, svc) => sum + (weights[svc.status] || 50), 0) / services.length;
  return Math.round(raw);
}

function computeHealthScoreForServices(services) {
  return computeHealthScore(services);
}

function buildCampusStates(campuses, services) {
  const states = {};
  for (const campus of campuses) {
    const relevant = services.filter((svc) => (svc.campuses || []).includes(campus.id) || (svc.campuses || []).includes('district'));
    const summary = summarize(relevant);
    states[campus.id] = {
      id: campus.id,
      name: campus.name,
      services: relevant.map((svc) => svc.id),
      summary,
      overallStatus: deriveOverallStatus(summary),
      healthScore: computeHealthScoreForServices(relevant),
      principalLabel: principalLabel(deriveOverallStatus(summary))
    };
  }
  return states;
}

function principalLabel(status, category) {
  if (category === 'queue') {
    if (status === 'green') return 'Queue Healthy';
    if (status === 'yellow') return 'Queue Elevated';
    return 'Queue Backlog';
  }
  if (status === 'green') return 'Working';
  if (status === 'yellow') return 'Limited';
  return 'Down';
}

function detectIncidents(services, history, campuses) {
  const incidents = [];
  const recent = history.slice(-6);
  const byId = Object.fromEntries(services.map((svc) => [svc.id, svc]));

  const internet = byId.internet;
  if (internet && internet.status === 'red') {
    const failedStreak = recent.filter((snap) => {
      const svc = (snap.services || []).find((x) => x.id === 'internet');
      return svc && svc.status === 'red';
    }).length;
    incidents.push({
      id: 'incident-internet',
      level: failedStreak >= 3 ? 'critical' : 'warning',
      title: failedStreak >= 3 ? 'Probable internet outage' : 'Internet instability detected',
      detail: internet.detail,
      impact: 'District-wide',
      confidence: failedStreak >= 3 ? 'High' : 'Medium',
      serviceId: 'internet'
    });
  }

  const wifi = byId.wifi;
  if (wifi && wifi.status !== 'green' && (wifi.meta?.apsOffline || 0) > 0) {
    incidents.push({
      id: 'incident-wifi',
      level: wifi.status === 'red' ? 'critical' : 'warning',
      title: wifi.status === 'red' ? 'Wireless disruption detected' : 'Wireless degradation detected',
      detail: wifi.detail,
      impact: inferCampusImpact(wifi, campuses),
      confidence: (wifi.meta?.apsOffline || 0) >= 3 ? 'High' : 'Medium',
      serviceId: 'wifi'
    });
  }

  const phones = byId.phones;
  if (phones && phones.status !== 'green') {
    incidents.push({
      id: 'incident-phones',
      level: phones.status === 'red' ? 'critical' : 'warning',
      title: phones.status === 'red' ? 'Phone service disruption' : 'Phone service degraded',
      detail: phones.detail,
      impact: 'District-wide',
      confidence: 'Medium',
      serviceId: 'phones'
    });
  }

  const helpdesk = byId.helpdesk;
  if (helpdesk && (helpdesk.meta?.openTickets || 0) > 0) {
    const openCount = helpdesk.meta.openTickets || 0;
    const recentCounts = recent
      .map((snap) => (snap.services || []).find((x) => x.id === 'helpdesk')?.meta?.openTickets)
      .filter((x) => Number.isFinite(x));
    const baseline = recentCounts.length ? recentCounts.reduce((a, b) => a + b, 0) / recentCounts.length : openCount;
    if (openCount >= (helpdesk.meta?.thresholds?.red || 40)) {
      incidents.push({
        id: 'incident-helpdesk',
        level: 'warning',
        title: 'Helpdesk backlog elevated',
        detail: `${openCount} active tickets in queue.`,
        impact: 'User support',
        confidence: 'High',
        serviceId: 'helpdesk'
      });
    } else if (baseline && openCount >= Math.max(8, baseline + 6)) {
      incidents.push({
        id: 'incident-helpdesk-surge',
        level: 'watch',
        title: 'Ticket surge detected',
        detail: `${openCount} active tickets versus a recent baseline of ${Math.round(baseline)}.`,
        impact: 'User support',
        confidence: 'Medium',
        serviceId: 'helpdesk'
      });
    }
  }

  return incidents.slice(0, 3);
}

function inferCampusImpact(service, campuses) {
  const scoped = (service.campuses || []).filter((id) => id !== 'district');
  if (!scoped.length) return 'District-wide';
  if (scoped.length === 1) {
    const campus = campuses.find((c) => c.id === scoped[0]);
    return campus ? campus.name : scoped[0];
  }
  return `${scoped.length} campuses`;
}

function loadAnnouncements() { return readJson(ANNOUNCEMENTS_FILE, []); }
function saveAnnouncements(items) { writeJson(ANNOUNCEMENTS_FILE, items.slice(0, 50)); }
function loadSettings() { return { ...defaultSettings, ...readJson(SETTINGS_FILE, defaultSettings) }; }
function currentLogoOrDefault() { return String(readJson(SETTINGS_FILE, defaultSettings).logoDataUrl || ''); }
function sanitizeSettings(input) {
  const pickColor = (value, fallback) => /^#([0-9a-fA-F]{6})$/.test(String(value || '')) ? String(value) : fallback;
  const cleaned = {
    brandName: String(input.brandName || '').trim().slice(0, 60) || defaultSettings.brandName,
    subtitle: String(input.subtitle || '').trim().slice(0, 120) || defaultSettings.subtitle,
    accent: pickColor(input.accent, defaultSettings.accent),
    accent2: pickColor(input.accent2, defaultSettings.accent2),
    surface: pickColor(input.surface, defaultSettings.surface),
    surfaceTint: pickColor(input.surfaceTint, defaultSettings.surfaceTint),
    text: pickColor(input.text, defaultSettings.text),
    muted: pickColor(input.muted, defaultSettings.muted),
    bg1: pickColor(input.bg1, defaultSettings.bg1),
    bg2: pickColor(input.bg2, defaultSettings.bg2),
    bg3: pickColor(input.bg3, defaultSettings.bg3),
    logoShape: ['rounded', 'circle', 'square'].includes(input.logoShape) ? input.logoShape : defaultSettings.logoShape,
    compactCards: Boolean(input.compactCards)
  };
  const logoDataUrl = String(input.logoDataUrl || '').trim();
  if (!logoDataUrl) cleaned.logoDataUrl = currentLogoOrDefault();
  else if (/^data:image\/(png|jpeg|jpg|webp|svg\+xml);base64,/i.test(logoDataUrl) && logoDataUrl.length <= 2_500_000) cleaned.logoDataUrl = logoDataUrl;
  else cleaned.logoDataUrl = currentLogoOrDefault();
  return cleaned;
}
function saveSettings(incoming) {
  const current = loadSettings();
  const next = { ...current, ...sanitizeSettings(incoming) };
  writeJson(SETTINGS_FILE, next);
  return next;
}
function isAuthorized(req) { return req.headers['x-admin-token'] === ADMIN_TOKEN; }

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon',
  '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg'
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (url.pathname === '/api/status' && req.method === 'GET') return json(res, 200, state);
  if (url.pathname === '/api/settings' && req.method === 'GET') return json(res, 200, loadSettings());
  if (url.pathname === '/api/settings' && req.method === 'POST') {
    if (!isAuthorized(req)) return json(res, 401, { error: 'Unauthorized' });
    const body = await readBody(req); return json(res, 200, saveSettings(body));
  }
  if (url.pathname === '/api/announcements' && req.method === 'GET') return json(res, 200, loadAnnouncements());
  if (url.pathname === '/api/history' && req.method === 'GET') return json(res, 200, readJson(HISTORY_FILE, []));
  if (url.pathname === '/api/checks/run' && req.method === 'POST') {
    if (!isAuthorized(req)) return json(res, 401, { error: 'Unauthorized' });
    await runChecks(); return json(res, 200, { ok: true, generatedAt: state.generatedAt });
  }
  if (url.pathname === '/api/announcements' && req.method === 'POST') {
    if (!isAuthorized(req)) return json(res, 401, { error: 'Unauthorized' });
    const body = await readBody(req);
    const current = loadAnnouncements();
    current.unshift({
      id: crypto.randomUUID(),
      title: String(body.title || '').trim(),
      body: String(body.body || '').trim(),
      priority: ['green', 'yellow', 'red'].includes(body.priority) ? body.priority : 'yellow',
      createdAt: nowIso()
    });
    saveAnnouncements(current); return json(res, 201, { ok: true });
  }
  if (url.pathname.startsWith('/api/announcements/') && req.method === 'DELETE') {
    if (!isAuthorized(req)) return json(res, 401, { error: 'Unauthorized' });
    const id = decodeURIComponent(url.pathname.split('/').pop());
    saveAnnouncements(loadAnnouncements().filter((item) => String(item.id) !== id));
    return json(res, 200, { ok: true });
  }
  if (url.pathname === '/api/campuses' && req.method === 'GET') return json(res, 200, readJson(CAMPUSES_FILE, []));
  if (url.pathname === '/api/plugins' && req.method === 'GET') return json(res, 200, readJson(PLUGINS_FILE, { plugins: [] }));

  serveStatic(req, res);
});

async function bootstrap() {
  loadSettings();
  await runChecks();
  setInterval(runChecks, CHECK_INTERVAL_MS);
  server.listen(PORT, HOST, () => console.log(`SchoolPulse listening on http://${HOST}:${PORT}`));
}
bootstrap().catch((error) => { console.error('Failed to start SchoolPulse:', error); process.exit(1); });

function json(res, statusCode, payload) { res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(payload, null, 2)); }
function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#')) continue;
    const idx = line.indexOf('='); if (idx === -1) continue;
    const key = line.slice(0, idx).trim(); const value = line.slice(idx + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}
function readBody(req) {
  return new Promise((resolve) => {
    let data = ''; req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => { try { resolve(data ? JSON.parse(data) : {}); } catch { resolve({}); } });
  });
}
function serveStatic(req, res) {
  const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = urlObj.pathname === '/' ? '/index.html' : urlObj.pathname;
  const filePath = path.join(__dirname, 'public', pathname.replace(/^\//, ''));
  if (!filePath.startsWith(path.join(__dirname, 'public'))) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('Forbidden'); return;
  }
  fs.readFile(filePath, (error, data) => {
    if (error) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  });
}
