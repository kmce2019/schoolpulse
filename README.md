# SchoolPulse

SchoolPulse is a self-hosted district IT status dashboard for Debian or Ubuntu. It is designed for front office TVs, principal dashboards, and an internal web page that answers the question: **"Is the network down or just my classroom?"**

## What this MVP includes

- Internet status with ping, internal HTTP, and gateway checks
- UniFi reachability, plus optional AP online/offline counts when you provide a controller-specific devices endpoint
- Google public service checks
- 3CX reachability now, with a hook for future handset/trunk metrics
- Linux-side printer share visibility checks against your Windows print server
- NeetoDesk ticket count monitoring
- Local announcements panel
- Manual refresh with admin token
- JSON-based persistence for announcements and recent history
- systemd unit and install script

## Why some integrations are marked optional

A few of your systems support richer APIs, but the exact endpoint and auth flow vary by platform version and local configuration:

- UniFi publishes version-specific API docs inside **UniFi Network > Settings > Control Plane > Integrations**, and the official docs say that is the right place to retrieve the localized Network API documentation. citeturn436626search0
- 3CX v20 exposes the Configuration API through a client application / token flow, not just a basic username/password scrape. Their official docs describe creating a client application, assigning permissions, and using tokens for access. citeturn436626search1turn436626search7
- NeetoDesk’s API uses an `X-Api-Key` header according to the official API docs. citeturn436626search2turn436626search5

So this package gives you a stable, running MVP now and leaves clean extension points where your environment-specific endpoint details can be dropped in later.

## Quick start

```bash
sudo apt update
sudo apt install -y nodejs npm smbclient
sudo mkdir -p /opt/schoolpulse
sudo chown $USER:$USER /opt/schoolpulse
cd /opt/schoolpulse
```

Copy the project files into `/opt/schoolpulse`, then:

```bash
cp .env.example .env
nano .env
node server.js
```

Open:

```text
http://YOUR_SERVER_IP:3030
```

## Production install

From inside the extracted project directory:

```bash
sudo ./scripts/install.sh
sudo nano /opt/schoolpulse/.env
sudo systemctl restart schoolpulse
sudo systemctl status schoolpulse
```

## Important env values to fill in

### Internet

- `INTERNET_PUBLIC_IP`
- `INTERNET_PING_TARGET`
- `INTERNET_HTTP_TARGET`
- `INTERNET_GATEWAY`

### UniFi

- `UNIFI_BASE_URL`
- `UNIFI_API_KEY`
- `UNIFI_DEVICES_ENDPOINT` for actual AP counts

If `UNIFI_DEVICES_ENDPOINT` is blank, SchoolPulse still checks whether the controller is reachable.

### SIS

Fill these later when you have them:

- `SIS_NAME`
- `SIS_URL`
- `SIS_API_KEY`

### 3CX

For now the package checks web reachability through `THREECX_URL`.

Later, once you create a proper 3CX API client/token, add:

- `THREECX_XAPI_BASE`
- `THREECX_XAPI_TOKEN`

### Printers

This Debian/Ubuntu MVP checks share visibility from Linux using `smbclient`.

Fill:

- `PRINT_SERVER_HOST`
- `PRINT_SERVER_SMB_USERNAME`
- `PRINT_SERVER_SMB_PASSWORD`
- `PRINT_SERVER_DOMAIN` if applicable
- `PRINT_QUEUES` separated by `|`

This validates whether the configured queue shares are visible. Queue-depth and stuck-job counts would need either:

- a small Windows helper on the print server, or
- a more advanced RPC-based polling layer.

### NeetoDesk

Fill:

- `NEETODESK_BASE_URL`
- `NEETODESK_API_KEY`
- `NEETODESK_OPEN_TICKETS_ENDPOINT`

## API routes

- `GET /api/status`
- `GET /api/announcements`
- `GET /api/history`
- `POST /api/checks/run` with header `X-Admin-Token`
- `POST /api/announcements` with header `X-Admin-Token`
- `DELETE /api/announcements/:id` with header `X-Admin-Token`

## Suggested next upgrades

- Add your real UniFi devices endpoint from the local UniFi integration docs
- Add 3CX token-based API polling for handsets and trunks
- Add SIS when you have the URL and auth method
- Add campus-specific views
- Add historical charts for outages and ticket counts
- Add email or SMS alerts when a status flips to yellow or red

## Security notes

- Do not commit your real `.env` file to Git
- Use read-only service credentials wherever possible
- Put the app behind Nginx or Caddy if exposing it internally on a standard HTTPS URL
