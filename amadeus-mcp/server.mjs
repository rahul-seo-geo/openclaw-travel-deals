import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { cheapestDates } from "./amadeus.mjs";

const server = new McpServer({
  name: "amadeus-mcp",
  version: "1.0.0"
});

server.tool(
  "cheapest_dates",
  "Get cheapest flight dates from Amadeus",
  {
    origin: z.string(),
    destination: z.string(),
    month: z.string()
  },
  async ({ origin, destination, month }) => {
    try {
      const data = await cheapestDates(origin, destination, month);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data)
          }
        ]
      };
    } catch (err) {
      throw err;
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

if (process.argv[1] && process.argv[1].endsWith("server.mjs")) {
  main().catch((err) => {
    console.error("Server error:", err);
    process.exit(1);
  });
}
