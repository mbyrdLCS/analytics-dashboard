import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { BetaAnalyticsDataClient } from "@google-analytics/data";
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
