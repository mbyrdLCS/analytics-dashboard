import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { AnalyticsAdminServiceClient } from "@google-analytics/admin";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load configuration
let config;
try {
  config = JSON.parse(readFileSync(join(__dirname, "config.json"), "utf-8"));
} catch (e) {
  console.error("Error loading config.json. Please create it with your propertyId and credentials path.");
  process.exit(1);
}

const { credentialsPath, defaultProperty, properties } = config;

// Initialize the Analytics Data client
const analyticsDataClient = new BetaAnalyticsDataClient({
  keyFilename: credentialsPath,
});

// Initialize the Analytics Admin client
const analyticsAdminClient = new AnalyticsAdminServiceClient({
  keyFilename: credentialsPath,
});

// Helper to resolve property ID from name or ID
function resolvePropertyId(propertyNameOrId) {
  if (!propertyNameOrId) {
    return properties[defaultProperty];
  }
  // Check if it's a named property
  if (properties[propertyNameOrId]) {
    return properties[propertyNameOrId];
  }
  // Otherwise assume it's a raw property ID
  return propertyNameOrId;
}

// Get list of available properties for tool descriptions
const propertyList = Object.keys(properties).join(", ");

// Create the MCP server
const server = new Server(
  {
    name: "google-analytics",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "list_properties",
        description: "List all configured Google Analytics properties",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "discover_all_properties",
        description: "Discover all GA4 properties in the Google Analytics account (including ones not yet configured here)",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "run_report",
        description:
          "Run a custom Google Analytics report with specified metrics and dimensions",
        inputSchema: {
          type: "object",
          properties: {
            property: {
              type: "string",
              description: `Property name or ID. Available: ${propertyList}`,
            },
            startDate: {
              type: "string",
              description: "Start date (YYYY-MM-DD) or relative like 'today', '7daysAgo', '30daysAgo'",
            },
            endDate: {
              type: "string",
              description: "End date (YYYY-MM-DD) or relative like 'today', 'yesterday'",
            },
            metrics: {
              type: "array",
              items: { type: "string" },
              description: "Metrics to retrieve (e.g., 'screenPageViews', 'sessions', 'totalUsers', 'bounceRate', 'averageSessionDuration')",
            },
            dimensions: {
              type: "array",
              items: { type: "string" },
              description: "Dimensions to group by (e.g., 'pagePath', 'country', 'city', 'deviceCategory', 'sessionSource')",
            },
            limit: {
              type: "number",
              description: "Maximum number of rows to return (default 10)",
            },
          },
          required: ["startDate", "endDate", "metrics"],
        },
      },
      {
        name: "get_top_pages",
        description: "Get the top pages by page views for a date range",
        inputSchema: {
          type: "object",
          properties: {
            property: {
              type: "string",
              description: `Property name or ID. Available: ${propertyList}`,
            },
            startDate: {
              type: "string",
              description: "Start date (YYYY-MM-DD or relative like '30daysAgo')",
            },
            endDate: {
              type: "string",
              description: "End date (YYYY-MM-DD or 'today')",
            },
            limit: {
              type: "number",
              description: "Number of pages to return (default 10)",
            },
          },
          required: ["startDate", "endDate"],
        },
      },
      {
        name: "get_traffic_sources",
        description: "Get traffic breakdown by source/medium",
        inputSchema: {
          type: "object",
          properties: {
            property: {
              type: "string",
              description: `Property name or ID. Available: ${propertyList}`,
            },
            startDate: {
              type: "string",
              description: "Start date (YYYY-MM-DD or relative)",
            },
            endDate: {
              type: "string",
              description: "End date (YYYY-MM-DD or 'today')",
            },
            limit: {
              type: "number",
              description: "Number of sources to return (default 10)",
            },
          },
          required: ["startDate", "endDate"],
        },
      },
      {
        name: "get_user_metrics",
        description: "Get user and session metrics for a date range",
        inputSchema: {
          type: "object",
          properties: {
            property: {
              type: "string",
              description: `Property name or ID. Available: ${propertyList}`,
            },
            startDate: {
              type: "string",
              description: "Start date (YYYY-MM-DD or relative)",
            },
            endDate: {
              type: "string",
              description: "End date (YYYY-MM-DD or 'today')",
            },
          },
          required: ["startDate", "endDate"],
        },
      },
      {
        name: "get_geo_breakdown",
        description: "Get user breakdown by country and city",
        inputSchema: {
          type: "object",
          properties: {
            property: {
              type: "string",
              description: `Property name or ID. Available: ${propertyList}`,
            },
            startDate: {
              type: "string",
              description: "Start date (YYYY-MM-DD or relative)",
            },
            endDate: {
              type: "string",
              description: "End date (YYYY-MM-DD or 'today')",
            },
            limit: {
              type: "number",
              description: "Number of locations to return (default 10)",
            },
          },
          required: ["startDate", "endDate"],
        },
      },
      {
        name: "get_device_breakdown",
        description: "Get user breakdown by device type (desktop, mobile, tablet)",
        inputSchema: {
          type: "object",
          properties: {
            property: {
              type: "string",
              description: `Property name or ID. Available: ${propertyList}`,
            },
            startDate: {
              type: "string",
              description: "Start date (YYYY-MM-DD or relative)",
            },
            endDate: {
              type: "string",
              description: "End date (YYYY-MM-DD or 'today')",
            },
          },
          required: ["startDate", "endDate"],
        },
      },
      {
        name: "get_realtime_users",
        description: "Get the number of users currently active on the site",
        inputSchema: {
          type: "object",
          properties: {
            property: {
              type: "string",
              description: `Property name or ID. Available: ${propertyList}`,
            },
          },
        },
      },
      {
        name: "get_data_streams",
        description: "List all data streams for a GA4 property (shows measurement IDs like G-XXXXXXX)",
        inputSchema: {
          type: "object",
          properties: {
            property: {
              type: "string",
              description: `Property name or ID. Available: ${propertyList}`,
            },
          },
        },
      },
      {
        name: "get_measurement_protocol_secrets",
        description: "List measurement protocol secrets for a data stream",
        inputSchema: {
          type: "object",
          properties: {
            property: {
              type: "string",
              description: `Property name or ID. Available: ${propertyList}`,
            },
            streamId: {
              type: "string",
              description: "Data stream ID (get from get_data_streams)",
            },
          },
          required: ["streamId"],
        },
      },
      {
        name: "get_google_ads_links",
        description: "List Google Ads links for a GA4 property",
        inputSchema: {
          type: "object",
          properties: {
            property: {
              type: "string",
              description: `Property name or ID. Available: ${propertyList}`,
            },
          },
        },
      },
      {
        name: "get_property_details",
        description: "Get detailed information about a GA4 property including creation time and settings",
        inputSchema: {
          type: "object",
          properties: {
            property: {
              type: "string",
              description: `Property name or ID. Available: ${propertyList}`,
            },
          },
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "list_properties": {
        const propList = Object.entries(properties)
          .map(([name, id]) => `${name}: ${id}${name === defaultProperty ? " (default)" : ""}`)
          .join("\n");
        return { content: [{ type: "text", text: `Available properties:\n${propList}` }] };
      }

      case "discover_all_properties": {
        const [accountSummaries] = await analyticsAdminClient.listAccountSummaries();
        if (!accountSummaries || accountSummaries.length === 0) {
          return { content: [{ type: "text", text: "No accounts found." }] };
        }
        let output = "All GA4 Properties:\n" + "=".repeat(60) + "\n";
        for (const account of accountSummaries) {
          output += `\nAccount: ${account.displayName} (${account.account})\n`;
          output += "-".repeat(40) + "\n";
          for (const prop of (account.propertySummaries || [])) {
            const propId = prop.property.replace("properties/", "");
            const isConfigured = Object.values(properties).includes(propId);
            output += `  ${prop.displayName}\n`;
            output += `    ID: ${propId}${isConfigured ? " (already configured)" : " ← NOT YET CONFIGURED"}\n`;
          }
        }
        return { content: [{ type: "text", text: output }] };
      }

      case "run_report": {
        const propertyId = resolvePropertyId(args.property);
        const [response] = await analyticsDataClient.runReport({
          property: `properties/${propertyId}`,
          dateRanges: [{ startDate: args.startDate, endDate: args.endDate }],
          metrics: args.metrics.map((m) => ({ name: m })),
          dimensions: args.dimensions?.map((d) => ({ name: d })) || [],
          limit: args.limit || 10,
        });
        return { content: [{ type: "text", text: formatReportResponse(response) }] };
      }

      case "get_top_pages": {
        const propertyId = resolvePropertyId(args.property);
        const [response] = await analyticsDataClient.runReport({
          property: `properties/${propertyId}`,
          dateRanges: [{ startDate: args.startDate, endDate: args.endDate }],
          metrics: [{ name: "screenPageViews" }, { name: "totalUsers" }, { name: "averageSessionDuration" }],
          dimensions: [{ name: "pagePath" }],
          orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
          limit: args.limit || 10,
        });
        return { content: [{ type: "text", text: formatReportResponse(response) }] };
      }

      case "get_traffic_sources": {
        const propertyId = resolvePropertyId(args.property);
        const [response] = await analyticsDataClient.runReport({
          property: `properties/${propertyId}`,
          dateRanges: [{ startDate: args.startDate, endDate: args.endDate }],
          metrics: [{ name: "sessions" }, { name: "totalUsers" }, { name: "bounceRate" }],
          dimensions: [{ name: "sessionSourceMedium" }],
          orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
          limit: args.limit || 10,
        });
        return { content: [{ type: "text", text: formatReportResponse(response) }] };
      }

      case "get_user_metrics": {
        const propertyId = resolvePropertyId(args.property);
        const [response] = await analyticsDataClient.runReport({
          property: `properties/${propertyId}`,
          dateRanges: [{ startDate: args.startDate, endDate: args.endDate }],
          metrics: [
            { name: "totalUsers" },
            { name: "newUsers" },
            { name: "sessions" },
            { name: "screenPageViews" },
            { name: "averageSessionDuration" },
            { name: "bounceRate" },
          ],
        });
        return { content: [{ type: "text", text: formatReportResponse(response) }] };
      }

      case "get_geo_breakdown": {
        const propertyId = resolvePropertyId(args.property);
        const [response] = await analyticsDataClient.runReport({
          property: `properties/${propertyId}`,
          dateRanges: [{ startDate: args.startDate, endDate: args.endDate }],
          metrics: [{ name: "totalUsers" }, { name: "sessions" }],
          dimensions: [{ name: "country" }, { name: "city" }],
          orderBys: [{ metric: { metricName: "totalUsers" }, desc: true }],
          limit: args.limit || 10,
        });
        return { content: [{ type: "text", text: formatReportResponse(response) }] };
      }

      case "get_device_breakdown": {
        const propertyId = resolvePropertyId(args.property);
        const [response] = await analyticsDataClient.runReport({
          property: `properties/${propertyId}`,
          dateRanges: [{ startDate: args.startDate, endDate: args.endDate }],
          metrics: [{ name: "totalUsers" }, { name: "sessions" }, { name: "screenPageViews" }],
          dimensions: [{ name: "deviceCategory" }],
          orderBys: [{ metric: { metricName: "totalUsers" }, desc: true }],
        });
        return { content: [{ type: "text", text: formatReportResponse(response) }] };
      }

      case "get_realtime_users": {
        const propertyId = resolvePropertyId(args.property);
        const [response] = await analyticsDataClient.runRealtimeReport({
          property: `properties/${propertyId}`,
          metrics: [{ name: "activeUsers" }],
        });
        const activeUsers = response.rows?.[0]?.metricValues?.[0]?.value || "0";
        return {
          content: [{ type: "text", text: `Currently active users: ${activeUsers}` }],
        };
      }

      case "get_data_streams": {
        const propertyId = resolvePropertyId(args.property);
        const [streams] = await analyticsAdminClient.listDataStreams({
          parent: `properties/${propertyId}`,
        });

        if (!streams || streams.length === 0) {
          return { content: [{ type: "text", text: "No data streams found for this property." }] };
        }

        let output = "Data Streams:\n" + "-".repeat(60) + "\n";
        for (const stream of streams) {
          const streamId = stream.name.split("/").pop();
          output += `Stream ID: ${streamId}\n`;
          output += `  Display Name: ${stream.displayName || "(none)"}\n`;
          output += `  Type: ${stream.type}\n`;
          if (stream.webStreamData) {
            output += `  Measurement ID: ${stream.webStreamData.measurementId}\n`;
            output += `  Default URI: ${stream.webStreamData.defaultUri || "(none)"}\n`;
          }
          if (stream.androidAppStreamData) {
            output += `  Package Name: ${stream.androidAppStreamData.packageName}\n`;
          }
          if (stream.iosAppStreamData) {
            output += `  Bundle ID: ${stream.iosAppStreamData.bundleId}\n`;
          }
          output += `  Create Time: ${stream.createTime || "unknown"}\n`;
          output += `  Update Time: ${stream.updateTime || "unknown"}\n`;
          output += "\n";
        }
        return { content: [{ type: "text", text: output }] };
      }

      case "get_measurement_protocol_secrets": {
        const propertyId = resolvePropertyId(args.property);
        const streamId = args.streamId;
        const [secrets] = await analyticsAdminClient.listMeasurementProtocolSecrets({
          parent: `properties/${propertyId}/dataStreams/${streamId}`,
        });

        if (!secrets || secrets.length === 0) {
          return { content: [{ type: "text", text: "No measurement protocol secrets found." }] };
        }

        let output = "Measurement Protocol Secrets:\n" + "-".repeat(60) + "\n";
        for (const secret of secrets) {
          output += `Name: ${secret.displayName || "(unnamed)"}\n`;
          output += `  Secret Value: ${secret.secretValue}\n\n`;
        }
        return { content: [{ type: "text", text: output }] };
      }

      case "get_google_ads_links": {
        const propertyId = resolvePropertyId(args.property);
        const [links] = await analyticsAdminClient.listGoogleAdsLinks({
          parent: `properties/${propertyId}`,
        });

        if (!links || links.length === 0) {
          return { content: [{ type: "text", text: "No Google Ads links found for this property." }] };
        }

        let output = "Google Ads Links:\n" + "-".repeat(60) + "\n";
        for (const link of links) {
          output += `Customer ID: ${link.customerId}\n`;
          output += `  Can Manage Clients: ${link.canManageClients}\n`;
          output += `  Ads Personalization Enabled: ${link.adsPersonalizationEnabled}\n`;
          output += `  Create Time: ${link.createTime || "unknown"}\n`;
          output += `  Update Time: ${link.updateTime || "unknown"}\n\n`;
        }
        return { content: [{ type: "text", text: output }] };
      }

      case "get_property_details": {
        const propertyId = resolvePropertyId(args.property);
        const [property] = await analyticsAdminClient.getProperty({
          name: `properties/${propertyId}`,
        });

        let output = "Property Details:\n" + "-".repeat(60) + "\n";
        output += `Property ID: ${propertyId}\n`;
        output += `Display Name: ${property.displayName}\n`;
        output += `Industry Category: ${property.industryCategory || "(not set)"}\n`;
        output += `Time Zone: ${property.timeZone}\n`;
        output += `Currency: ${property.currencyCode}\n`;
        output += `Service Level: ${property.serviceLevel}\n`;
        output += `Create Time: ${property.createTime}\n`;
        output += `Update Time: ${property.updateTime}\n`;
        output += `Parent: ${property.parent || "(none)"}\n`;

        return { content: [{ type: "text", text: output }] };
      }

      default:
        return { content: [{ type: "text", text: `Unknown tool: ${name}` }] };
    }
  } catch (error) {
    return {
      content: [{ type: "text", text: `Error: ${error.message}` }],
      isError: true,
    };
  }
});

// Format the API response into readable text
function formatReportResponse(response) {
  if (!response.rows || response.rows.length === 0) {
    return "No data found for the specified date range.";
  }

  const dimensionHeaders = response.dimensionHeaders?.map((h) => h.name) || [];
  const metricHeaders = response.metricHeaders?.map((h) => h.name) || [];

  let output = "";

  // Header
  if (dimensionHeaders.length > 0 || metricHeaders.length > 0) {
    output += [...dimensionHeaders, ...metricHeaders].join(" | ") + "\n";
    output += "-".repeat(60) + "\n";
  }

  // Rows
  for (const row of response.rows) {
    const dimensions = row.dimensionValues?.map((d) => d.value) || [];
    const metrics = row.metricValues?.map((m) => formatMetricValue(m.value)) || [];
    output += [...dimensions, ...metrics].join(" | ") + "\n";
  }

  // Summary
  if (response.rowCount) {
    output += `\nTotal rows: ${response.rowCount}`;
  }

  return output;
}

// Format metric values (round numbers, format percentages, etc.)
function formatMetricValue(value) {
  const num = parseFloat(value);
  if (isNaN(num)) return value;

  // If it looks like a percentage (between 0 and 1 with decimals)
  if (num > 0 && num < 1 && value.includes(".")) {
    return (num * 100).toFixed(2) + "%";
  }

  // If it's a whole number
  if (Number.isInteger(num)) {
    return num.toLocaleString();
  }

  // Otherwise round to 2 decimal places
  return num.toFixed(2);
}

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Google Analytics MCP server running");
}

main().catch(console.error);
