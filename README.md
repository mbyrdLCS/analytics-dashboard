# Google Analytics MCP Server

MCP server for querying Google Analytics Data API from Claude Code.

## Properties

| Name | Property ID | Description |
|------|-------------|-------------|
| `b1-app` | 363280261 | B1 App - GA4 (default) |
| `b1-checkin` | 508251303 | B1 Checkin |
| `b1-mobile` | 347220825 | B1 Mobile |
| `b1-web` | 363397146 | B1 Web - GA4 |
| `chums` | 363393805 | CHUMS - GA4 |
| `chums-checkin` | 253731874 | CHUMS Checkin |
| `chums-checkin-new` | 467523149 | CHUMS Checkin (new) |
| `churchapps-player` | 481476264 | ChurchApps Player |
| `churchapps` | 363427908 | ChurchApps.org - GA4 |
| `freeshow` | 408962359 | FreeShow |
| `freeshow-app` | 416366588 | FreeShow App |
| `freeshow-remote` | 509223110 | FreeShow Remote |
| `lessons-church` | 363411724 | Lessons.church - GA4 |

## Available Tools

| Tool | Description |
|------|-------------|
| `list_properties` | List all configured properties |
| `run_report` | Custom query with any metrics/dimensions |
| `get_top_pages` | Top pages by page views |
| `get_traffic_sources` | Traffic breakdown by source/medium |
| `get_user_metrics` | Users, sessions, bounce rate, etc. |
| `get_geo_breakdown` | Users by country/city |
| `get_device_breakdown` | Desktop vs mobile vs tablet |
| `get_realtime_users` | Currently active users |

## Date Formats

- Absolute: `YYYY-MM-DD` (e.g., `2025-12-01`)
- Relative: `today`, `yesterday`, `7daysAgo`, `30daysAgo`, `90daysAgo`

## Common Metrics

- `totalUsers` - Total users
- `newUsers` - New users
- `sessions` - Sessions
- `screenPageViews` - Page views
- `bounceRate` - Bounce rate
- `averageSessionDuration` - Avg session duration
- `engagementRate` - Engagement rate

## Common Dimensions

- `pagePath` - Page URL path
- `pageTitle` - Page title
- `country` - Country
- `city` - City
- `deviceCategory` - Device type (desktop/mobile/tablet)
- `sessionSource` - Traffic source
- `sessionMedium` - Traffic medium
- `sessionSourceMedium` - Combined source/medium

## Example Queries

- "How many users visited freeshow last month?"
- "What are the top 10 pages for churchapps this week?"
- "Compare traffic sources for b1-app vs b1-web"
- "Show device breakdown for lessons-church last 30 days"
- "How many realtime users on chums right now?"

## Setup

1. Service account: `analytics-mcp@mcpserver-465217.iam.gserviceaccount.com`
2. Credentials file: `/Users/MJB/GoogleAnylitcsMCP/credentials.json`
3. Registered with Claude Code as `google-analytics`

---

## Analytics Dashboard

A web dashboard displaying real-time Google Analytics for ChurchApps properties.

**Live URL:** https://analytics-dashboard-seven-ebon.vercel.app/

**Embedded at:** https://churchapps.org/analytics

### Properties Tracked

**Apps**
| Property | ID | Notes |
|----------|-----|-------|
| B1 Admin | 516573834 | |
| FreeShow App | 416366588 | Shows Sunday usage |
| B1 Mobile | 347220825 | |
| B1 Checkin | 508251303 | Shows Sunday usage |

**Websites**
| Property | ID | Notes |
|----------|-----|-------|
| FreeShow.app | 408962359 | |
| B1.church | 363397146 | |
| Lessons.church | 363411724 | |
| ChurchApps.org | 363427908 | Needs tracking code fix |

### Features

- Real-time user count (with live indicator)
- Multiple time ranges: Today, 7 Days, 14 Days, 28 Days
- Traffic sources visualization with bar charts
- Top countries with flag emojis (click "View all" for full list)
- Sunday usage metric for church apps (FreeShow App, B1 Checkin)
- Auto-refreshes every 5 minutes
- Mobile responsive design
- Dark themed UI

### Running Locally

```bash
cd /Users/MJB/GoogleAnylitcsMCP
node dashboard-server.js
# Opens at http://localhost:3847
```

### Deploying to Vercel

1. Push code to GitHub: https://github.com/mbyrdLCS/analytics-dashboard

2. In Vercel, add environment variable:
   - **Name:** `GOOGLE_CREDENTIALS`
   - **Value:** Contents of `credentials.json` as a single line

   To convert credentials to single line:
   ```bash
   cat credentials.json | jq -c .
   ```
   (Output saved in `credentials-oneline.txt` for convenience)

3. Vercel auto-deploys on each push to main

### Embedding in an iframe

```html
<iframe
  src="https://analytics-dashboard-seven-ebon.vercel.app/"
  style="width: 100%; height: 100vh; border: none; min-height: 800px;"
  frameborder="0">
</iframe>
```

### Optional Password Protection

Set `DASHBOARD_PASSWORD` environment variable in Vercel to require a password.

### Files

| File | Description |
|------|-------------|
| `dashboard-server.js` | Express server and API endpoints |
| `public/index.html` | Dashboard UI |
| `public/login.html` | Login page (if password enabled) |
| `vercel.json` | Vercel deployment config |
| `credentials.json` | Google credentials (not in git) |
| `credentials-oneline.txt` | Single-line credentials for Vercel (not in git) |

### macOS Dock App

Drag `Analytics Dashboard.app` to your Dock for quick local access.

### Customization

Edit `dashboard-server.js` to change which properties are tracked:

```javascript
const properties = {
  websites: {
    label: "Websites",
    items: {
      "freeshow": { name: "FreeShow.app", id: "408962359" },
      "b1-web": { name: "B1.church", id: "363397146" },
      "lessons-church": { name: "Lessons.church", id: "363411724" },
      "churchapps": { name: "ChurchApps.org", id: "363427908" },
    }
  },
  apps: {
    label: "Apps",
    items: {
      "b1-admin": { name: "B1 Admin", id: "516573834" },
      "freeshow-app": { name: "FreeShow App", id: "416366588" },
      "b1-mobile": { name: "B1 Mobile", id: "347220825" },
      "b1-checkin": { name: "B1 Checkin", id: "508251303" },
    }
  }
};
```

### Known Issues

- **ChurchApps.org shows no data:** The website has the wrong tracking ID installed. It currently has `G-XYCPBKWXB5` but needs `G-KQ02ER7SZ9`.
