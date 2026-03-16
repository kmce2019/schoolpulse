const { exec } = require('child_process');
const { escapeShellArg, toNumber } = require('./utils');

function listSmbShares(host, username, password, domain) {
  return new Promise((resolve, reject) => {
    const auth = username
      ? `-U ${escapeShellArg(`${domain ? `${domain}\\` : ''}${username}%${password || ''}`)}`
      : '-N';
    const cmd = `smbclient -g -L ${escapeShellArg(host)} ${auth}`;
    exec(cmd, { timeout: 15000 }, (error, stdout, stderr) => {
      if (error) return reject(new Error(stderr || error.message));
      resolve(stdout || '');
    });
  });
}

async function checkPrinters(env) {
  const host = env.PRINT_SERVER_HOST;
  const configuredQueues = String(env.PRINT_QUEUES || '')
    .split('|')
    .map((x) => x.trim())
    .filter(Boolean);

  const yellowThreshold = toNumber(env.PRINT_YELLOW_OFFLINE_QUEUES, 1);
  const redThreshold = toNumber(env.PRINT_RED_OFFLINE_QUEUES, 2);

  try {
    const output = await listSmbShares(
      host,
      env.PRINT_SERVER_SMB_USERNAME,
      env.PRINT_SERVER_SMB_PASSWORD,
      env.PRINT_SERVER_DOMAIN
    );

    const availablePrinters = output
      .split('\n')
      .filter((line) => line.startsWith('Printer|'))
      .map((line) => line.split('|')[1].trim());

    const offlineQueues = configuredQueues.filter((name) => !availablePrinters.includes(name));
    const status = offlineQueues.length >= redThreshold ? 'red' : offlineQueues.length >= yellowThreshold ? 'yellow' : 'green';
    const detail = configuredQueues.length === 0
      ? 'No printer queues are configured.'
      : offlineQueues.length === 0
        ? `All ${configuredQueues.length} configured printer queues are visible on ${host}.`
        : `${offlineQueues.length} configured printer queue(s) were not visible on ${host}.`;

    return {
      id: 'printers',
      name: 'Printer Queues',
      status,
      detail,
      meta: {
        host,
        configuredQueues,
        availablePrinters,
        offlineQueues,
        note: 'This Linux MVP validates printer-share visibility. Stuck-job counts would require a Windows-side helper or RPC-based queue polling.'
      }
    };
  } catch (error) {
    return {
      id: 'printers',
      name: 'Printer Queues',
      status: 'red',
      detail: 'Printer share check failed.',
      meta: { host, error: error.message }
    };
  }
}

module.exports = checkPrinters;
