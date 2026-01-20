#!/usr/bin/env node
import express from "express";
import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { readFileSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3847;

// Password protection
const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD || null;

// Configuration - use env var or local file
let credentials;
let credentialsError = null;
try {
  if (process.env.GOOGLE_CREDENTIALS) {
    credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
  } else {
    credentials = JSON.parse(readFileSync(join(__dirname, "credentials.json"), "utf-8"));
  }
} catch (err) {
  credentialsError = err.message;
  credentials = null;
}
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

// Initialize the Analytics Data client
let analyticsDataClient = null;
if (credentials) {
  analyticsDataClient = new BetaAnalyticsDataClient({
    credentials: credentials,
  });
}

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    hasCredentials: !!credentials,
    credentialsError: credentialsError,
    nodeVersion: process.version,
    vercel: process.env.VERCEL === '1'
  });
});

// Password protection middleware
if (DASHBOARD_PASSWORD) {
  app.use((req, res, next) => {
    // Skip auth check for the login page and static assets
    if (req.path === '/login' || req.path === '/api/login') {
      return next();
    }

    const authCookie = req.headers.cookie?.split(';').find(c => c.trim().startsWith('auth='));
    const isAuthed = authCookie?.split('=')[1] === 'true';

    if (!isAuthed && req.path !== '/login.html') {
      if (req.path.startsWith('/api/')) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      return res.redirect('/login.html');
    }
    next();
  });

  // Login endpoint
  app.post('/api/login', express.json(), (req, res) => {
    if (req.body.password === DASHBOARD_PASSWORD) {
      res.setHeader('Set-Cookie', 'auth=true; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400');
      res.json({ success: true });
    } else {
      res.status(401).json({ error: 'Invalid password' });
    }
  });
}

// Serve static files
app.use(express.static(join(__dirname, "public")));

// Helper to fetch stats for a property
async function fetchPropertyStats(key, prop, timeRanges) {
  const result = {
    name: prop.name,
    ranges: {},
  };

  // Get time range stats
  for (const range of timeRanges) {
    try {
      const [response] = await analyticsDataClient.runReport({
        property: `properties/${prop.id}`,
        dateRanges: [{ startDate: range.start, endDate: range.end }],
        metrics: [
          { name: "totalUsers" },
          { name: "newUsers" },
          { name: "sessions" },
          { name: "screenPageViews" },
        ],
      });

      if (response.rows && response.rows.length > 0) {
        const row = response.rows[0];
        result.ranges[range.label] = {
          users: parseInt(row.metricValues[0].value),
          newUsers: parseInt(row.metricValues[1].value),
          sessions: parseInt(row.metricValues[2].value),
          pageViews: parseInt(row.metricValues[3].value),
        };
      } else {
        result.ranges[range.label] = { users: 0, newUsers: 0, sessions: 0, pageViews: 0 };
      }
    } catch (err) {
      result.ranges[range.label] = { users: 0, newUsers: 0, sessions: 0, pageViews: 0 };
    }
  }

  // Get realtime users
  try {
    const [response] = await analyticsDataClient.runRealtimeReport({
      property: `properties/${prop.id}`,
      metrics: [{ name: "activeUsers" }],
    });
    result.realtime = parseInt(response.rows?.[0]?.metricValues?.[0]?.value || "0");
  } catch (err) {
    result.realtime = 0;
  }

  // Get traffic sources
  try {
    const [response] = await analyticsDataClient.runReport({
      property: `properties/${prop.id}`,
      dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
      metrics: [{ name: "sessions" }],
      dimensions: [{ name: "sessionSourceMedium" }],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      limit: 5,
    });

    result.trafficSources = [];
    if (response.rows) {
      for (const row of response.rows) {
        const source = row.dimensionValues[0].value;
        const sessions = parseInt(row.metricValues[0].value);
        let cleanName = source
          .replace(" / organic", "")
          .replace(" / referral", "")
          .replace(" / cpc", " (Ads)")
          .replace("(direct) / (none)", "Direct")
          .replace("(not set)", "Other");
        result.trafficSources.push({ name: cleanName, sessions });
      }
    }
  } catch (err) {
    result.trafficSources = [];
  }

  // Get top countries
  try {
    const [response] = await analyticsDataClient.runReport({
      property: `properties/${prop.id}`,
      dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
      metrics: [{ name: "totalUsers" }],
      dimensions: [{ name: "country" }],
      orderBys: [{ metric: { metricName: "totalUsers" }, desc: true }],
      limit: 20,
    });

    result.countries = [];
    if (response.rows) {
      for (const row of response.rows) {
        const country = row.dimensionValues[0].value;
        const users = parseInt(row.metricValues[0].value);
        // Skip (not set), empty strings, and blank values
        if (country && country !== "(not set)" && country.trim() !== "") {
          result.countries.push({ name: country, users });
        }
      }
    }
  } catch (err) {
    result.countries = [];
  }

  // Get Sunday users (for apps like FreeShow)
  try {
    // Calculate the most recent Sunday date
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const lastSunday = new Date(today);
    lastSunday.setDate(today.getDate() - dayOfWeek);
    const sundayDate = lastSunday.toISOString().split('T')[0]; // Format as YYYY-MM-DD

    const [response] = await analyticsDataClient.runReport({
      property: `properties/${prop.id}`,
      dateRanges: [{ startDate: sundayDate, endDate: sundayDate }],
      metrics: [{ name: "totalUsers" }],
    });

    if (response.rows && response.rows.length > 0) {
      result.sundayUsers = parseInt(response.rows[0].metricValues[0].value);
    } else {
      result.sundayUsers = 0;
    }
  } catch (err) {
    result.sundayUsers = 0;
  }

  // Get new users via dimension (fallback for apps where newUsers metric returns 0)
  if (result.ranges['7 Days']?.newUsers === 0) {
    try {
      const [response] = await analyticsDataClient.runReport({
        property: `properties/${prop.id}`,
        dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
        metrics: [{ name: "totalUsers" }],
        dimensions: [{ name: "newVsReturning" }],
        dimensionFilter: {
          filter: {
            fieldName: "newVsReturning",
            stringFilter: { value: "new" }
          }
        }
      });

      if (response.rows && response.rows.length > 0) {
        const newUsersFromDimension = parseInt(response.rows[0].metricValues[0].value);
        // Update all ranges with this new user count (proportionally estimated)
        const ratio7d = newUsersFromDimension / (result.ranges['7 Days']?.users || 1);
        for (const rangeLabel of Object.keys(result.ranges)) {
          if (result.ranges[rangeLabel].newUsers === 0) {
            result.ranges[rangeLabel].newUsers = Math.round(result.ranges[rangeLabel].users * ratio7d);
          }
        }
      }
    } catch (err) {
      // Keep existing values
    }
  }

  // Get sessions via activeUsers if sessions is 0 (for apps)
  if (result.ranges['7 Days']?.sessions === 0 && result.ranges['7 Days']?.users > 0) {
    // Use pageViews as a proxy for engagement since sessions aren't tracked
    for (const rangeLabel of Object.keys(result.ranges)) {
      if (result.ranges[rangeLabel].sessions === 0) {
        result.ranges[rangeLabel].sessions = result.ranges[rangeLabel].pageViews;
      }
    }
  }

  result.propertyKey = key;
  return result;
}

// API endpoint for partner traffic tracking (svsolutionsusa.com)
app.get("/api/partner/svsolutionsusa", async (req, res) => {
  if (!analyticsDataClient) {
    return res.status(500).json({
      error: "Analytics client not initialized",
      credentialsError: credentialsError
    });
  }
  try {
    const propertyId = properties.websites.items.freeshow.id;
    const timeRanges = [
      { label: "Today", start: "today", end: "today" },
      { label: "7 Days", start: "7daysAgo", end: "today" },
      { label: "14 Days", start: "14daysAgo", end: "today" },
      { label: "28 Days", start: "28daysAgo", end: "today" },
      { label: "All Time", start: "2020-01-01", end: "today" },
    ];

    const result = {
      partner: "SV Solutions USA",
      website: "freeshow.app/downloads",
      ranges: {},
    };

    // Get time range stats filtered by UTM source
    for (const range of timeRanges) {
      try {
        const [response] = await analyticsDataClient.runReport({
          property: `properties/${propertyId}`,
          dateRanges: [{ startDate: range.start, endDate: range.end }],
          metrics: [
            { name: "totalUsers" },
            { name: "newUsers" },
            { name: "sessions" },
            { name: "screenPageViews" },
            { name: "averageSessionDuration" },
          ],
          dimensionFilter: {
            filter: {
              fieldName: "sessionSource",
              stringFilter: { value: "svsolutionsusa" }
            }
          }
        });

        if (response.rows && response.rows.length > 0) {
          const row = response.rows[0];
          result.ranges[range.label] = {
            users: parseInt(row.metricValues[0].value),
            newUsers: parseInt(row.metricValues[1].value),
            sessions: parseInt(row.metricValues[2].value),
            pageViews: parseInt(row.metricValues[3].value),
            avgSessionDuration: parseFloat(row.metricValues[4].value),
          };
        } else {
          result.ranges[range.label] = { users: 0, newUsers: 0, sessions: 0, pageViews: 0, avgSessionDuration: 0 };
        }
      } catch (err) {
        result.ranges[range.label] = { users: 0, newUsers: 0, sessions: 0, pageViews: 0, avgSessionDuration: 0 };
      }
    }

    // Get top pages visited from this source (7 days)
    try {
      const [response] = await analyticsDataClient.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
        metrics: [{ name: "screenPageViews" }, { name: "totalUsers" }],
        dimensions: [{ name: "pagePath" }],
        dimensionFilter: {
          filter: {
            fieldName: "sessionSource",
            stringFilter: { value: "svsolutionsusa" }
          }
        },
        orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
        limit: 10,
      });

      result.topPages = [];
      if (response.rows) {
        for (const row of response.rows) {
          const path = row.dimensionValues[0].value;
          const views = parseInt(row.metricValues[0].value);
          const users = parseInt(row.metricValues[1].value);
          result.topPages.push({ path, views, users });
        }
      }
    } catch (err) {
      result.topPages = [];
    }

    // Get daily traffic for last 30 days
    try {
      const [response] = await analyticsDataClient.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
        metrics: [{ name: "totalUsers" }, { name: "sessions" }],
        dimensions: [{ name: "date" }],
        dimensionFilter: {
          filter: {
            fieldName: "sessionSource",
            stringFilter: { value: "svsolutionsusa" }
          }
        },
        orderBys: [{ dimension: { dimensionName: "date" } }],
      });

      result.dailyTraffic = [];
      if (response.rows) {
        for (const row of response.rows) {
          const date = row.dimensionValues[0].value;
          const users = parseInt(row.metricValues[0].value);
          const sessions = parseInt(row.metricValues[1].value);
          result.dailyTraffic.push({ date, users, sessions });
        }
      }
    } catch (err) {
      result.dailyTraffic = [];
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API endpoint to get stats
app.get("/api/stats", async (req, res) => {
  if (!analyticsDataClient) {
    return res.status(500).json({
      error: "Analytics client not initialized",
      credentialsError: credentialsError
    });
  }
  try {
    const timeRanges = [
      { label: "Today", start: "today", end: "today" },
      { label: "7 Days", start: "7daysAgo", end: "today" },
      { label: "14 Days", start: "14daysAgo", end: "today" },
      { label: "28 Days", start: "28daysAgo", end: "today" },
    ];

    const results = {
      websites: { label: properties.websites.label, items: {} },
      apps: { label: properties.apps.label, items: {} },
    };

    // Fetch website stats
    for (const [key, prop] of Object.entries(properties.websites.items)) {
      results.websites.items[key] = await fetchPropertyStats(key, prop, timeRanges);
    }

    // Fetch app stats
    for (const [key, prop] of Object.entries(properties.apps.items)) {
      results.apps.items[key] = await fetchPropertyStats(key, prop, timeRanges);
    }

    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Only listen when running locally (not on Vercel)
if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`Dashboard running at http://localhost:${PORT}`);
  });
}

// Export for Vercel serverless
export default app;
