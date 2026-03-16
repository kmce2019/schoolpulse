const { httpGet, toNumber } = require('./utils');

async function checkSis(env) {
  if (!env.SIS_URL) {
    return {
      id: 'sis',
      name: env.SIS_NAME || 'SIS',
      status: 'yellow',
      detail: 'SIS is not configured yet.',
      meta: { configured: false }
    };
  }

  try {
    const res = await httpGet(env.SIS_URL, toNumber(env.SIS_HTTP_TIMEOUT_MS, 5000), env.SIS_API_KEY ? { 'X-Api-Key': env.SIS_API_KEY } : {});
    return {
      id: 'sis',
      name: env.SIS_NAME || 'SIS',
      status: res.ok ? 'green' : 'red',
      detail: res.ok ? 'SIS endpoint responded normally.' : `SIS endpoint returned HTTP ${res.status}.`,
      meta: { configured: true, httpStatus: res.status }
    };
  } catch (error) {
    return {
      id: 'sis',
      name: env.SIS_NAME || 'SIS',
      status: 'red',
      detail: 'SIS check failed.',
      meta: { configured: true, error: error.message }
    };
  }
}

module.exports = checkSis;
