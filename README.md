# SchoolPulse

![Version](https://img.shields.io/badge/version-0.1.0-orange)
![Node](https://img.shields.io/badge/node-%3E%3D18-green)
![Platform](https://img.shields.io/badge/platform-linux-blue)
![License](https://img.shields.io/github/license/kmce2019/schoolpulse)
![Status](https://img.shields.io/badge/status-active-success)

SchoolPulse is a **self-hosted IT status dashboard built for school districts**.

It provides a clean, simple view of district technology health so staff, principals, and IT teams can quickly answer:

**"Is the problem just me, or is it district-wide?"**

SchoolPulse aggregates the health of multiple systems into one page that works well on:

- front office TVs
- principal dashboards
- internal staff pages
- IT wallboards

---

# Features

- District technology status dashboard
- Internet / WAN monitoring
- WiFi health checks
- Phone system monitoring
- Printer queue visibility
- Helpdesk queue monitoring
- Incident detection
- IT Health Score
- Campus filtering
- Principal-friendly simplified view
- TV / kiosk display mode
- Logo upload and branding
- Theme color customization
- Plugin-ready architecture

---

# Example Services Monitored

SchoolPulse can monitor systems such as:

- Internet / WAN connectivity
- UniFi WiFi infrastructure
- PBX / phone systems
- Helpdesk platforms (NeetoDesk)
- Printer servers
- Google services
- SIS
- ClassLink
- other internal systems

Each service reports a simple status:

| Color | Meaning |
|------|------|
| Green | Healthy |
| Yellow | Degraded |
| Red | Outage or critical condition |

---

# Installation

SchoolPulse runs on a simple Linux server.

### Requirements

- Debian or Ubuntu server
- Node.js 18+
- Git
- Internal network access to monitored systems

---

## 1. Clone the repository

```bash
git clone https://github.com/kmce2019/schoolpulse.git
cd schoolpulse
```

---

## 2. Install dependencies

```bash
npm install
```

---

## 3. Configure environment variables

Create the environment configuration file:

```bash
cp .env.example .env
```

Edit the file:

```bash
nano .env
```

Example configuration:

```env
PORT=3030
HOST=0.0.0.0

ADMIN_TOKEN=changeme

# Internet check
INTERNET_PING_TARGET=8.8.8.8
INTERNET_HTTP_TARGET=https://example.org
INTERNET_GATEWAY=10.0.0.1

# Helpdesk
NEETODESK_BASE_URL=https://yourdistrict.neetodesk.com
NEETODESK_API_KEY=YOUR_API_KEY
NEETODESK_OPEN_TICKETS_ENDPOINT=/api/v1/public/tickets
```

---

## 4. Start SchoolPulse

For testing:

```bash
node server.js
```

Open the dashboard:

```
http://SERVER_IP:3030
```

Example:

```
http://192.168.1.237:3030
```

---

# Production Deployment

SchoolPulse can run as a background service using **systemd**.

---

## Install systemd service

```bash
sudo cp systemd/schoolpulse.service /etc/systemd/system/
```

---

## Reload systemd

```bash
sudo systemctl daemon-reload
```

---

## Enable automatic startup

```bash
sudo systemctl enable schoolpulse
```

---

## Start the service

```bash
sudo systemctl start schoolpulse
```

---

## Verify status

```bash
sudo systemctl status schoolpulse
```

---

# Accessing the Dashboard

Open the dashboard in a browser:

```
http://SERVER_IP:3030
```

Example:

```
http://192.168.1.237:3030
```

---

# Display Modes

SchoolPulse supports several display modes.

---

## Default Dashboard

```
http://SERVER_IP:3030
```

Full IT dashboard view.

---

## TV / Kiosk Mode

```
http://SERVER_IP:3030/?tv=1
```

Optimized for:

- office TVs
- IT wallboards
- digital signage

---

## Principal View

```
http://SERVER_IP:3030/?view=principal
```

Simplified language intended for administrators.

Example status labels:

- Working
- Limited
- Down

---

## Campus Filtering

```
http://SERVER_IP:3030/?campus=hs
```

Example campus IDs:

- `district`
- `hs`
- `jh`
- `elem`

---

# Branding

SchoolPulse supports simple branding.

The admin token is configured in `.env`.

Example:

```
ADMIN_TOKEN=changeme
```

Branding options include:

- logo upload
- accent colors
- theme customization
- compact card layout

---

# IT Health Score

SchoolPulse calculates an overall district health score based on service status.

Example scoring model:

| Status | Score |
|------|------|
| Green | 100 |
| Yellow | 70 |
| Red | 0 |

The final score is the average of all monitored services.

Example:

```
Internet   Green
WiFi       Green
Phones     Yellow
Printers   Green
Helpdesk   Green
```

Health Score:

```
94
```

---

# Incident Detection

SchoolPulse can detect incidents automatically based on service behavior.

Examples:

- Internet unreachable for multiple checks
- WiFi access point outages
- PBX trunk failures
- sudden spikes in helpdesk tickets

Instead of showing many red services, SchoolPulse surfaces a single message such as:

- **Probable internet outage**
- **Wireless degradation detected**
- **Phone system disruption**
- **Elevated helpdesk backlog**

---

# Plugin Architecture

SchoolPulse supports a plugin-style monitoring system.

Each plugin returns a standard service object:

```javascript
{
  id: "wifi",
  name: "WiFi",
  status: "green",
  detail: "28 of 30 APs online",
  meta: {
    totalAps: 30,
    onlineAps: 28
  }
}
```

Plugins can be written for integrations such as:

- UniFi
- Meraki
- 3CX
- RingCentral
- NeetoDesk
- Google Workspace
- backup systems
- cameras / NVR
- printers

---

# Updating SchoolPulse

If installed via Git:

```bash
git pull
npm install
sudo systemctl restart schoolpulse
```

---

# Troubleshooting

## View service logs

```bash
sudo journalctl -u schoolpulse -n 100
```

---

## Restart the service

```bash
sudo systemctl restart schoolpulse
```

---

## Test the API

```bash
curl http://127.0.0.1:3030/api/status
```

---

# Security Notes

Do **not commit your `.env` file**.

It contains sensitive information such as:

- API keys
- system credentials
- admin tokens

Use `.env.example` for documentation.

---

# Recommended .gitignore

```
.env
node_modules
*.log
data/history.json
data/announcements.json
data/settings.json
uploads/
```

---

# License

Choose the license that fits your goals.

Common choices:

- MIT
- Apache 2.0
- Proprietary internal use

---

# Maintainer

Built and maintained by **Kevin Gardner / Forge IT**

SchoolPulse helps school districts understand technology health quickly without digging through multiple administrative systems.
