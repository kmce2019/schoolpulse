const { httpGet } = require('./utils');

async function checkGoogle() {
  const endpoints = [
    'https://www.google.com/generate_204',
    'https://classroom.google.com'
  ];

  const results = [];
  for (const url of endpoints) {
    try {
      const res = await httpGet(url, 5000);
      results.push({ url, ok: res.ok || res.status === 204, status: res.status });
    } catch {
      results.push({ url, ok: false, status: null });
    }
  }

  const failures = results.filter((r) => !r.ok).length;
  const status = failures >= 2 ? 'red' : failures === 1 ? 'yellow' : 'green';
  const detail = failures === 0
    ? 'Google public services responded normally.'
    : failures === 1
      ? 'One Google endpoint failed to respond normally.'
      : 'Google public endpoints failed.';

  return {
    id: 'google',
    name: 'Google Services',
    status,
    detail,
    meta: { checks: results }
  };
}

module.exports = checkGoogle;
