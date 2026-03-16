const { httpGet, toNumber } = require('./utils');

async function fetchTicketsPage(baseUrl, endpoint, apiKey, timeoutMs, pageNumber) {
  const separator = endpoint.includes('?') ? '&' : '?';
  const url = `${baseUrl.replace(/\/$/, '')}${endpoint}${separator}page_number=${pageNumber}`;
  return httpGet(url, timeoutMs, {
    'X-Api-Key': apiKey,
    Accept: 'application/json'
  });
}

async function checkNeetoDesk(env) {
  const baseUrl = env.NEETODESK_BASE_URL;
  const endpoint = env.NEETODESK_OPEN_TICKETS_ENDPOINT || '/api/v1/public/tickets';
  const timeoutMs = toNumber(env.NEETODESK_HTTP_TIMEOUT_MS, 5000);
  const yellowThreshold = toNumber(env.NEETODESK_YELLOW_OPEN_TICKETS, 10);
  const redThreshold = toNumber(env.NEETODESK_RED_OPEN_TICKETS, 20);

  const openStatuses = new Set([
    'new',
    'open',
    'on_hold',
    'waiting_on_customer',
    'waiting on customer',
    'waiting on you',
    'waiting on parts'
  ]);

  try {
    let allTickets = [];
    let pageNumber = 1;
    let totalPages = 1;
    let lastStatus = 200;

    while (pageNumber <= totalPages) {
      const res = await fetchTicketsPage(baseUrl, endpoint, env.NEETODESK_API_KEY, timeoutMs, pageNumber);
      lastStatus = res.status;
      if (!res.ok) {
        return {
          id: 'helpdesk', name: 'Helpdesk Queue', status: 'red',
          detail: `NeetoDesk returned HTTP ${res.status}.`,
          meta: { endpoint, httpStatus: res.status }
        };
      }

      const parsed = JSON.parse(res.text || '{}');
      const tickets = Array.isArray(parsed) ? parsed : Array.isArray(parsed.tickets) ? parsed.tickets : Array.isArray(parsed.data) ? parsed.data : [];
      allTickets.push(...tickets);
      const pagination = parsed.pagination || {};
      totalPages = Number(pagination.total_pages || 1);
      pageNumber += 1;
    }

    const openTickets = allTickets.filter((t) => {
      const status = String(t.status || t.state || t.ticket_status || t.status_name || '').toLowerCase().trim();
      return openStatuses.has(status);
    });

    const waitingOnCustomer = openTickets.filter((t) => String(t.status || t.state || t.ticket_status || t.status_name || '').toLowerCase().trim() === 'waiting on customer' || String(t.status || t.state || t.ticket_status || t.status_name || '').toLowerCase().trim() === 'waiting_on_customer').length;
    const waitingOnYou = openTickets.filter((t) => String(t.status || t.state || t.ticket_status || t.status_name || '').toLowerCase().trim() === 'waiting on you').length;
    const waitingOnParts = openTickets.filter((t) => String(t.status || t.state || t.ticket_status || t.status_name || '').toLowerCase().trim() === 'waiting on parts').length;

    const count = openTickets.length;
    const status = count >= redThreshold ? 'red' : count >= yellowThreshold ? 'yellow' : 'green';
    const detail = count >= redThreshold
      ? `${count} open tickets. Queue backlog is high.`
      : count >= yellowThreshold
        ? `${count} open tickets. Queue is elevated.`
        : `${count} open tickets. Queue is healthy.`;

    return {
      id: 'helpdesk',
      name: 'Helpdesk Queue',
      status,
      detail,
      meta: {
        openTickets: count,
        waitingOnCustomer,
        waitingOnYou,
        waitingOnParts,
        totalTicketsFetched: allTickets.length,
        endpoint,
        httpStatus: lastStatus,
        thresholds: { yellow: yellowThreshold, red: redThreshold },
        openStatuses: Array.from(openStatuses)
      }
    };
  } catch (error) {
    return {
      id: 'helpdesk',
      name: 'Helpdesk Queue',
      status: 'red',
      detail: 'NeetoDesk check failed.',
      meta: { error: error.message }
    };
  }
}

module.exports = checkNeetoDesk;
