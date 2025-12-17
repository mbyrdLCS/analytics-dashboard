#!/usr/bin/env node
import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { execSync } from "child_process";

// Configuration
const credentialsPath = "/Users/MJB/GoogleAnylitcsMCP/credentials.json";
const properties = {
  "B1 Admin": "516573834",
  "B1 Mobile": "347220825",
  "FreeShow": "408962359",
  "Lessons.church": "363411724",
};

// Initialize the Analytics Data client
const analyticsDataClient = new BetaAnalyticsDataClient({
  keyFilename: credentialsPath,
});

async function getStats(propertyName, propertyId) {
  try {
    const [response] = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
      metrics: [
        { name: "totalUsers" },
        { name: "newUsers" },
        { name: "sessions" },
      ],
    });

    if (response.rows && response.rows.length > 0) {
      const row = response.rows[0];
      const users = parseInt(row.metricValues[0].value).toLocaleString();
      const newUsers = parseInt(row.metricValues[1].value).toLocaleString();
      const sessions = parseInt(row.metricValues[2].value).toLocaleString();
      return `${propertyName}:\n   Users: ${users}  |  New: ${newUsers}  |  Sessions: ${sessions}`;
    }
    return `${propertyName}: No data`;
  } catch (error) {
    return `${propertyName}: Error - ${error.message}`;
  }
}

async function main() {
  console.log("Fetching analytics data...");

  const results = await Promise.all(
    Object.entries(properties).map(([name, id]) => getStats(name, id))
  );

  const message = `Analytics (Last 7 Days)\n${"─".repeat(35)}\n\n${results.join("\n\n")}`;

  // Show macOS dialog
  const escapedMessage = message.replace(/"/g, '\\"').replace(/\n/g, "\\n");
  const script = `display dialog "${escapedMessage}" with title "Analytics Dashboard" buttons {"OK"} default button "OK"`;

  try {
    execSync(`osascript -e '${script}'`);
  } catch (e) {
    // User clicked OK or closed dialog
  }
}

main().catch(console.error);
