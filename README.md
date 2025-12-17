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

## Analytics Dashboard App

A standalone macOS app that displays analytics for key properties in your browser.

### Properties Tracked

**Websites**
- FreeShow.app
- B1.church

**Apps**
- FreeShow App
- B1 Mobile
- Lessons.church
- B1 Admin

### Features

- Real-time user count (with live indicator)
- Multiple time ranges: Today, 7 Days, 14 Days, 28 Days
- Users, sessions, new users, and page views
- Auto-refreshes every 5 minutes
- Dark themed UI

### Usage

1. **Add to Dock**: Drag `Analytics Dashboard.app` from this folder to your Dock
2. **Click to launch**: Opens a browser dashboard at `http://localhost:3847`
3. The server starts automatically and stays running in the background

### Files

| File | Description |
|------|-------------|
| `Analytics Dashboard.app` | macOS app (double-click or add to Dock) |
| `dashboard-server.js` | Express server that serves the dashboard |
| `public/index.html` | Dashboard HTML/CSS/JS |

### Manual Start

To run the dashboard server manually:

```bash
cd /Users/MJB/GoogleAnylitcsMCP
node dashboard-server.js
# Opens at http://localhost:3847
```

### Customization

Edit `dashboard-server.js` to change which properties are tracked:

```javascript
const properties = {
  websites: {
    label: "Websites",
    items: {
      "freeshow": { name: "FreeShow.app", id: "408962359" },
      "b1-web": { name: "B1.church", id: "363397146" },
    }
  },
  apps: {
    label: "Apps",
    items: {
      "freeshow-app": { name: "FreeShow App", id: "416366588" },
      "b1-mobile": { name: "B1 Mobile", id: "347220825" },
      "lessons-church": { name: "Lessons.church", id: "363411724" },
      "b1-admin": { name: "B1 Admin", id: "516573834" },
    }
  }
};
```
