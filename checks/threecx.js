const { httpGet, toNumber } = require('./utils');

async function checkThreeCx(env) {
  const baseUrl = env.THREECX_URL;
  const timeoutMs = toNumber(env.THREECX_HTTP_TIMEOUT_MS, 5000);

  try {
    const res = await httpGet(baseUrl, timeoutMs);
    let status = res.ok ? 'green' : 'red';
    let detail = res.ok ? '3CX web interface is reachable.' : `3CX returned HTTP ${res.status}.`;
    const meta = {
      version: env.THREECX_VERSION || '',
      license: env.THREECX_LICENSE || '',
      pbxOnline: res.ok,
      handsetsRegistered: null,
      trunksUp: null,
      trunksDown: null,
      note: 'Populate THREECX_XAPI_BASE and THREECX_XAPI_TOKEN later to add handset and trunk counts.'
    };

    if (env.THREECX_XAPI_BASE && env.THREECX_XAPI_TOKEN) {
      try {
        const apiRes = await httpGet(env.THREECX_XAPI_BASE, timeoutMs, {
          Authorization: `Bearer ${env.THREECX_XAPI_TOKEN}`,
          Accept: 'application/json'
        });
        if (apiRes.ok) {
          let parsed = {};
          try { parsed = JSON.parse(apiRes.text || '{}'); } catch {}
          meta.handsetsRegistered = parsed.handsetsRegistered ?? parsed.extensionsRegistered ?? null;
          meta.trunksUp = parsed.trunksUp ?? null;
          meta.trunksDown = parsed.trunksDown ?? null;
          detail = meta.handsetsRegistered !== null || meta.trunksUp !== null
            ? `3CX reachable • Handsets: ${meta.handsetsRegistered ?? 'n/a'} • Trunks up/down: ${meta.trunksUp ?? 'n/a'}/${meta.trunksDown ?? 'n/a'}`
            : detail;
          if ((meta.trunksDown || 0) > 0) status = 'yellow';
        }
      } catch {
        status = 'yellow';
        detail = '3CX web interface is reachable, but XAPI details were unavailable.';
      }
    }

    return {
      id: 'phones',
      name: 'Phones',
      status,
      detail,
      meta
    };
  } catch (error) {
    return {
      id: 'phones',
      name: 'Phones',
      status: 'red',
      detail: '3CX check failed.',
      meta: { error: error.message }
    };
  }
}

module.exports = checkThreeCx;
