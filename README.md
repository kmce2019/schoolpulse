# SchoolPulse

SchoolPulse is a self-hosted IT status dashboard built for school districts.

It gives staff, principals, front offices, and IT teams a clean view of district technology health without forcing them to understand every technical detail behind the scenes.

## What SchoolPulse does

SchoolPulse can display the live status of district systems such as:

- Internet / WAN
- WiFi / wireless infrastructure
- Google services
- SIS
- PBX / phone system
- printer queues
- helpdesk queue
- district announcements

It is designed to work well on:

- front office TVs
- principal dashboards
- internal staff webpages
- IT NOC-style displays

## Current feature set

- One-page status dashboard
- Green / yellow / red service health
- IT Health Score
- Principal-friendly simplified view
- TV / kiosk mode
- Campus tabs
- Branding controls
- Logo upload
- Theme colors
- Helpdesk integration
- Basic incident detection
- Plugin-ready architecture

## Suggested repo structure

This structure keeps SchoolPulse simple now, while making it easier to grow later.

```text
schoolpulse/
├── README.md
├── .gitignore
├── .env.example
├── package.json
├── package-lock.json
│
├── server.js
├── app/
│   ├── config/
│   │   ├── campuses.json
│   │   ├── plugins.json
│   │   ├── services.json
│   │   └── theme.default.json
│   │
│   ├── core/
│   │   ├── status-engine.js
│   │   ├── incident-engine.js
│   │   ├── health-score.js
│   │   ├── plugin-loader.js
│   │   ├── campus-filter.js
│   │   └── auth.js
│   │
│   ├── plugins/
│   │   ├── internet/
│   │   │   ├── index.js
│   │   │   └── config.schema.json
│   │   ├── unifi/
│   │   │   ├── index.js
│   │   │   └── config.schema.json
│   │   ├── threecx/
│   │   │   ├── index.js
│   │   │   └── config.schema.json
│   │   ├── printers/
│   │   │   ├── index.js
│   │   │   └── config.schema.json
│   │   ├── neetodesk/
│   │   │   ├── index.js
│   │   │   └── config.schema.json
│   │   └── google/
│   │       ├── index.js
│   │       └── config.schema.json
│   │
│   ├── routes/
│   │   ├── api-status.js
│   │   ├── api-settings.js
│   │   ├── api-history.js
│   │   ├── api-campuses.js
│   │   └── api-announcements.js
│   │
│   ├── services/
│   │   ├── settings-store.js
│   │   ├── history-store.js
│   │   ├── announcements-store.js
│   │   └── logger.js
│   │
│   └── utils/
│       ├── http.js
│       ├── json.js
│       ├── time.js
│       └── normalize.js
│
├── public/
│   ├── index.html
│   ├── app.js
│   ├── styles.css
│   └── assets/
│
├── data/
│   ├── announcements.json
│   ├── history.json
│   └── settings.json
│
├── systemd/
│   └── schoolpulse.service
│
├── scripts/
│   ├── install.sh
│   ├── backup.sh
│   └── update.sh
│
└── docs/
    ├── architecture.md
    ├── plugins.md
    ├── incidents.md
    └── screenshots/
```

## Why this structure works

### `app/core`
This is where the real SchoolPulse logic should live.

Examples:

- status aggregation
- health-score calculations
- incident detection
- plugin loading
- campus filtering

This keeps that logic out of `server.js`, which should stay small.

### `app/plugins`
Each integration gets its own folder and standard interface.

That means each plugin can return a common result like:

```js
{
  id: "wifi",
  name: "WiFi",
  status: "green",
  detail: "28 of 30 APs online.",
  meta: {
    totalAps: 30,
    onlineAps: 28
  }
}
```

This makes it easy to add future integrations without rewriting the whole app.

### `app/routes`
Separating routes keeps the API clean and easier to debug.

Example routes:

- `/api/status`
- `/api/settings`
- `/api/history`
- `/api/campuses`
- `/api/announcements`

### `app/services`
This is where file-backed or database-backed helpers should live.

Examples:

- saving settings
- reading history
- loading announcements
- logging events

### `public`
Right now SchoolPulse works great as a simple one-page app. Keeping `index.html`, `app.js`, and `styles.css` separate will make future UI changes easier without overcomplicating the stack.

## Recommended plugin pattern

Each plugin should export one async function:

```js
module.exports = async function runPlugin(context) {
  return {
    id: "internet",
    name: "Internet",
    status: "green",
    detail: "Gateway reachable. WAN latency is healthy.",
    meta: {
      latencyMs: 12
    }
  };
};
```

### Plugin context example

```js
{
  env,
  config,
  campus,
  now,
  helpers
}
```

### Why this helps

It allows SchoolPulse to load only the plugins you enable, and it makes each service easy to test independently.

## Recommended incident model

Incidents should be generated separately from raw service checks.

Example:

- Internet service red for 3 checks in a row
- WiFi service yellow on multiple campuses
- PBX reachable but trunk down
- ticket count spikes suddenly

Then SchoolPulse can show a single clean banner such as:

- Probable internet outage
- Wireless degradation detected
- Phone service disruption
- Elevated helpdesk backlog

This keeps the dashboard useful for non-technical viewers.

## Recommended health score model

Keep the Health Score simple.

Suggested scoring:

- green = 100
- yellow = 70
- red = 0

Then average the active services in the current view.

Example:

- Internet: green
- WiFi: green
- Phones: yellow
- Helpdesk: green
- Printers: green

Health Score:

```text
(100 + 100 + 70 + 100 + 100) / 5 = 94
```

That gives school leaders a fast summary without reading every card.

## Recommended simple UI philosophy

Keep the layout simple and readable.

Top to bottom:

1. Header
   - logo
   - district name
   - IT Health Score
   - active incident banner

2. Campus tabs
   - District
   - High School
   - Junior High
   - Elementary

3. Main service cards
   - Internet
   - WiFi
   - Phones
   - Printers
   - Helpdesk
   - Google
   - SIS

4. Announcement strip
   - maintenance
   - outages
   - reminders

5. Optional admin drawer
   - branding
   - theme colors
   - logo upload
   - plugin enable/disable

This keeps the page clean even as features expand.

## Current integrations

SchoolPulse is currently well-positioned to support plugins for:

- Internet / WAN
- UniFi
- 3CX
- printer queues
- NeetoDesk
- Google services
- SIS
- ClassLink
- backups
- cameras / NVR
- Chromebook fleet health

## Suggested Git hygiene

Use a `.gitignore` like this:

```gitignore
.env
node_modules
*.log
data/history.json
data/announcements.json
data/settings.json
uploads/
```

Keep real secrets out of the repo.

## Example `.env.example`

```env
PORT=3030
HOST=0.0.0.0

ADMIN_TOKEN=YOUR_ADMIN_TOKEN

INTERNET_PING_TARGET=8.8.8.8
INTERNET_HTTP_TARGET=https://example.org
INTERNET_GATEWAY=10.0.0.1

UNIFI_BASE_URL=https://unifi.example.org
UNIFI_API_KEY=YOUR_UNIFI_API_KEY

THREECX_BASE_URL=https://phones.example.org
THREECX_USERNAME=YOUR_3CX_USERNAME
THREECX_PASSWORD=YOUR_3CX_PASSWORD

NEETODESK_BASE_URL=https://example.neetodesk.com
NEETODESK_API_KEY=YOUR_NEETODESK_API_KEY
NEETODESK_OPEN_TICKETS_ENDPOINT=/api/v1/public/tickets

PRINTER_SERVER=g-gisd02
```

## Deployment notes

Current deployment target:

- Debian or Ubuntu
- Node.js via systemd
- no Docker required
- internal LAN deployment
- browser-based UI

Basic deploy flow:

```bash
sudo systemctl stop schoolpulse
sudo rsync -av --delete ./ /opt/schoolpulse/
sudo systemctl daemon-reload
sudo systemctl restart schoolpulse
sudo systemctl status schoolpulse
```

## Future roadmap ideas

- More plugin integrations
- Better incident grouping
- Alerting by email or webhook
- Theme presets
- Better principal summaries
- District health history snapshots
- Auto-discovery for printers and devices
- Plugin enable/disable UI
- Authenticated admin settings panel
- Lightweight database backend if file storage becomes limiting

## Why SchoolPulse matters

Most school districts have all the data they need to understand technology health, but it is spread across:

- WiFi controllers
- helpdesk systems
- phone systems
- status pages
- print servers
- admin tools

SchoolPulse turns that into one clean district-facing page that answers the question:

**"Is the issue just me, or is it a real district problem?"**

## License

Choose the license that best fits your goals.

Examples:

- MIT if you want it open and flexible
- Proprietary if this stays internal to Forge IT
- Private GitHub repo if you want controlled sharing only

## Maintainer

Built and maintained by Kevin Gardner / Forge IT.

<p align="center">
  <img src="docs/banner.png" alt="SchoolPulse Banner" width="100%">
</p>

# SchoolPulse
