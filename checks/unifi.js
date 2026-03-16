const { httpGet, toNumber } = require('./utils');

async function checkUnifi(env) {
  const baseUrl = env.UNIFI_BASE_URL;
  const devicesEndpoint = env.UNIFI_DEVICES_ENDPOINT;
  const apiKey = env.UNIFI_API_KEY;
  const timeoutMs = toNumber(env.UNIFI_HTTP_TIMEOUT_MS, 5000);
  const yellowThreshold = toNumber(env.UNIFI_YELLOW_OFFLINE_APS, 1);
  const redThreshold = toNumber(env.UNIFI_RED_OFFLINE_APS, 3);

  try {
    const reachability = await httpGet(baseUrl, timeoutMs, apiKey ? { 'X-Api-Key': apiKey } : {});
    if (!devicesEndpoint) {
      return {
        id: 'wifi',
        name: 'WiFi',
        status: reachability.ok ? 'green' : 'red',
        detail: reachability.ok
          ? 'UniFi controller reachable. Set UNIFI_DEVICES_ENDPOINT to enable AP online counts.'
          : 'UniFi controller is not reachable.',
        meta: {
          controllerReachable: reachability.ok,
          controllerStatus: reachability.status,
          apsOnline: null,
          apsOffline: null,
          note: 'Controller-specific devices endpoint not configured.'
        }
      };
    }

    const devicesResponse = await httpGet(devicesEndpoint, timeoutMs, {
      'X-Api-Key': apiKey,
      'Content-Type': 'application/json'
    });

    let payload = [];
    try {
      const parsed = JSON.parse(devicesResponse.text || '[]');
      payload = Array.isArray(parsed) ? parsed : parsed.data || parsed.devices || [];
    } catch {
      payload = [];
    }

    const aps = payload.filter((d) => {
      const kind = String(d.type || d.deviceType || d.model || '').toLowerCase();
      return kind.includes('uap') || kind.includes('ap') || kind.includes('access');
    });
    const offline = aps.filter((d) => {
      const state = String(d.state || d.status || d.connectionState || '').toLowerCase();
      return state.includes('down') || state.includes('offline') || state === 'disconnected' || state === 'false';
    });

    const status = offline.length >= redThreshold ? 'red' : offline.length >= yellowThreshold ? 'yellow' : 'green';
    const detail = aps.length === 0
      ? 'Controller reached, but no AP data was parsed from the devices endpoint.'
      : offline.length === 0
        ? `All ${aps.length} APs are online.`
        : `${offline.length} of ${aps.length} APs appear offline.`;

    return {
      id: 'wifi',
      name: 'WiFi',
      status,
      detail,
      meta: {
        controllerReachable: true,
        controllerStatus: reachability.status,
        apsOnline: Math.max(0, aps.length - offline.length),
        apsOffline: offline.length,
        endpoint: devicesEndpoint
      }
    };
  } catch (error) {
    return {
      id: 'wifi',
      name: 'WiFi',
      status: 'red',
      detail: 'UniFi check failed.',
      meta: { error: error.message }
    };
  }
}

module.exports = checkUnifi;
