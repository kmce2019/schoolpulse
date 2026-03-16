const { pingHost, httpGet } = require('./utils');

async function checkInternet(env) {
  const pingTarget = env.INTERNET_PING_TARGET;
  const httpTarget = env.INTERNET_HTTP_TARGET;
  const gateway = env.INTERNET_GATEWAY;
  const timeoutMs = Number(env.INTERNET_HTTP_TIMEOUT_MS || 3000);

  const [pingResult, httpResult, gatewayResult] = await Promise.all([
    pingTarget ? pingHost(pingTarget) : Promise.resolve({ ok: false, latencyMs: null }),
    httpTarget ? httpGet(httpTarget, timeoutMs).catch(() => ({ ok: false, status: null })) : Promise.resolve({ ok: false, status: null }),
    gateway ? pingHost(gateway) : Promise.resolve({ ok: false, latencyMs: null })
  ]);

  let severity = 0;
  if (!pingResult.ok && !httpResult.ok) severity = 2;
  else if (!gatewayResult.ok || !httpResult.ok) severity = 1;

  const status = severity >= 2 ? 'red' : severity === 1 ? 'yellow' : 'green';
  const detail = !pingResult.ok && !httpResult.ok
    ? 'External ping and internal HTTP check failed.'
    : !httpResult.ok
      ? 'Ping is healthy, but the internal HTTP target failed.'
      : !gatewayResult.ok
        ? 'Internet is up, but the gateway did not respond.'
        : `Ping ${pingResult.latencyMs ?? 'n/a'} ms • HTTP ${httpResult.status ?? 'n/a'} • Gateway reachable`;

  return {
    id: 'internet',
    name: 'Internet',
    status,
    detail,
    meta: {
      publicIp: env.INTERNET_PUBLIC_IP || '',
      pingTarget,
      httpTarget,
      gateway,
      latencyMs: pingResult.latencyMs,
      httpStatus: httpResult.status,
      gatewayReachable: gatewayResult.ok
    }
  };
}

module.exports = checkInternet;
