const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

function nowIso() {
  return new Date().toISOString();
}

function statusFromSeverity(severity) {
  return severity >= 2 ? 'red' : severity === 1 ? 'yellow' : 'green';
}

function withTimeout(promise, ms, label = 'timeout') {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(label)), ms))
  ]);
}

function pingHost(target, timeoutSeconds = 2) {
  return new Promise((resolve) => {
    exec(`ping -c 1 -W ${timeoutSeconds} ${escapeShellArg(target)}`, (error, stdout) => {
      const timeMatch = stdout && stdout.match(/time=([0-9.]+)/);
      resolve({
        ok: !error,
        latencyMs: timeMatch ? Number(timeMatch[1]) : null
      });
    });
  });
}

function httpGet(url, timeoutMs, headers = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { headers, signal: controller.signal, redirect: 'follow' })
    .then(async (res) => ({
      ok: res.ok,
      status: res.status,
      text: await res.text()
    }))
    .finally(() => clearTimeout(timeout));
}

function ensureJsonFile(filePath, fallback) {
  const full = path.resolve(filePath);
  if (!fs.existsSync(full)) {
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, JSON.stringify(fallback, null, 2));
  }
}

function readJson(filePath, fallback) {
  try {
    ensureJsonFile(filePath, fallback);
    return JSON.parse(fs.readFileSync(path.resolve(filePath), 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(path.resolve(filePath)), { recursive: true });
  fs.writeFileSync(path.resolve(filePath), JSON.stringify(value, null, 2));
}

function toNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function escapeShellArg(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

module.exports = {
  nowIso,
  statusFromSeverity,
  withTimeout,
  pingHost,
  httpGet,
  readJson,
  writeJson,
  toNumber,
  escapeShellArg
};
