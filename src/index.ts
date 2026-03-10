#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import http from "node:http";
import { parseArgs } from "node:util";
import { randomUUID } from "node:crypto";

import { OpenClawClient, setDebug, isDebug } from "./client.js";
import {
  agentTools,
  messageTools,
  sessionTools,
  channelTools,
  nodeTools,
  memoryTools,
  cronTools,
  configTools,
  gatewayTools,
  browserTools,
} from "./tools/index.js";
import { handleToolCall } from "./handlers.js";
import { VERSION, SERVER_NAME } from "./constants.js";

export interface OpenClawMCPOptions {
  gatewayUrl?: string;
  gatewayToken?: string;
  timeout?: number;
}

export function createServer(options: OpenClawMCPOptions = {}) {
  const gatewayUrl = options.gatewayUrl || process.env.OPENCLAW_GATEWAY_URL || "ws://127.0.0.1:18789";
  const gatewayToken = options.gatewayToken || process.env.OPENCLAW_GATEWAY_TOKEN;

  const client = new OpenClawClient({
    gatewayUrl,
    gatewayToken,
    timeout: options.timeout || 60000,
  });

  const server = new Server(
    {
      name: SERVER_NAME,
      version: VERSION,
    },
    {
      capabilities: {
        tools: {},
        resources: {},
      },
    }
  );

  // List all available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        ...agentTools,
        ...messageTools,
        ...sessionTools,
        ...channelTools,
        ...nodeTools,
        ...memoryTools,
        ...cronTools,
        ...configTools,
        ...gatewayTools,
        ...browserTools,
      ],
    };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    return handleToolCall(request.params.name, request.params.arguments || {}, client);
  });

  // List available resources
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {
      resources: [
        {
          uri: "openclaw://config",
          name: "OpenClaw Configuration",
          description: "Current OpenClaw gateway configuration",
          mimeType: "application/json",
        },
        {
          uri: "openclaw://status",
          name: "Gateway Status",
          description: "Current gateway status and health",
          mimeType: "application/json",
        },
        {
          uri: "openclaw://sessions",
          name: "Active Sessions",
          description: "List of active conversation sessions",
          mimeType: "application/json",
        },
        {
          uri: "openclaw://channels",
          name: "Connected Channels",
          description: "List of connected messaging channels",
          mimeType: "application/json",
        },
        {
          uri: "openclaw://agents",
          name: "Configured Agents",
          description: "List of configured agents/workspaces",
          mimeType: "application/json",
        },
      ],
    };
  });

  // Handle resource reads
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const uri = request.params.uri;

    try {
      let content: string;
      switch (uri) {
        case "openclaw://config":
          content = JSON.stringify(await client.getConfig(), null, 2);
          break;
        case "openclaw://status":
          content = JSON.stringify(await client.getHealth(), null, 2);
          break;
        case "openclaw://sessions":
          content = JSON.stringify(await client.listSessions(), null, 2);
          break;
        case "openclaw://channels":
          content = JSON.stringify(await client.listChannels(), null, 2);
          break;
        case "openclaw://agents":
          content = JSON.stringify(await client.listAgents(), null, 2);
          break;
        default:
          throw new Error(`Unknown resource: ${uri}`);
      }

      return {
        contents: [
          {
            uri,
            mimeType: "application/json",
            text: content,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to read resource ${uri}: ${error}`);
    }
  });

  return { server, client };
}

function printHelp() {
  console.log(`
${SERVER_NAME} v${VERSION}

Usage:
  openclaw-mcp [options]

Options:
  --stdio              Use stdio transport (default)
  --port <number>      Start HTTP server on port (for remote access)
  --host <string>      Host to bind (default: 127.0.0.1, use 0.0.0.0 for all)
  --token <string>     API token for authentication (required for HTTP mode)
  --gateway-url <url>  OpenClaw gateway URL (default: ws://127.0.0.1:18789)
  --gateway-token      OpenClaw gateway token (or set OPENCLAW_GATEWAY_TOKEN)
  --debug              Enable debug logging (or set OPENCLAW_DEBUG=true)
  --help, -h           Show this help

Environment Variables:
  OPENCLAW_GATEWAY_URL   Gateway WebSocket URL
  OPENCLAW_GATEWAY_TOKEN Gateway authentication token
  OPENCLAW_MCP_TOKEN     MCP server API token (for HTTP mode)

Examples:
  # Local usage with stdio (for Claude Code)
  openclaw-mcp --stdio

  # HTTP server for remote access
  openclaw-mcp --port 3000 --token your-secret-token

  # Connect to remote OpenClaw gateway
  openclaw-mcp --gateway-url wss://your-gateway.com/ws --gateway-token your-gw-token

Claude Code Configuration (~/.claude/settings.json):
  {
    "mcpServers": {
      "openclaw": {
        "command": "openclaw-mcp",
        "args": ["--stdio"]
      }
    }
  }

Remote Claude Code Configuration (HTTP):
  {
    "mcpServers": {
      "openclaw": {
        "url": "http://your-server:3000/mcp",
        "headers": {
          "Authorization": "Bearer your-secret-token"
        }
      }
    }
  }
`);
}

function safeEqualSecret(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

async function runStdio() {
  const { server, client } = createServer();

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error(`${SERVER_NAME} v${VERSION} started (stdio mode)`);
  console.error("Connecting to OpenClaw Gateway...");

  // Cleanup on exit
  process.on("SIGINT", async () => {
    console.error("Shutting down...");
    await client.disconnect();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    console.error("Shutting down...");
    await client.disconnect();
    process.exit(0);
  });
}

async function runHttpServer(port: number, host: string, mcpToken: string | undefined) {
  const httpServer = http.createServer(async (req, res) => {
    // Health check endpoint
    const url = new URL(req.url || "/", `http://${req.headers.host}`);
    if (url.pathname === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        status: "ok",
        server: SERVER_NAME,
        version: VERSION,
      }));
      return;
    }

    // MCP endpoint
    if (url.pathname === "/mcp") {
      // Token authentication
      if (mcpToken) {
        const authHeader = req.headers.authorization || "";
        const token = authHeader.startsWith("Bearer ")
          ? authHeader.slice(7)
          : url.searchParams.get("token");

        if (!token || !safeEqualSecret(token, mcpToken)) {
          res.writeHead(401, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Unauthorized" }));
          return;
        }
      }

      // Create new server and transport for each request (stateless mode)
      // In stateless mode, each request is independent and no session is maintained
      const { server, client } = createServer();
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined, // Stateless mode - no session tracking
        enableJsonResponse: true, // Return JSON responses instead of SSE streams
      });

      await server.connect(transport);
      await transport.handleRequest(req, res);

      req.on("close", () => {
        client.disconnect();
      });
      return;
    }

    // 404 for unknown paths
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
  });

  return new Promise<void>((resolve) => {
    httpServer.listen(port, host, () => {
      console.error(`${SERVER_NAME} v${VERSION} started (HTTP mode)`);
      console.error(`Listening on http://${host}:${port}`);
      console.error(`MCP endpoint: http://${host}:${port}/mcp`);
      console.error(`Health check: http://${host}:${port}/health`);
      if (mcpToken) {
        console.error("Authentication: enabled (Bearer token)");
      } else {
        console.error("Authentication: disabled (no --token provided)");
      }
    });

    process.on("SIGINT", () => {
      console.error("Shutting down...");
      httpServer.close(() => resolve());
    });

    process.on("SIGTERM", () => {
      console.error("Shutting down...");
      httpServer.close(() => resolve());
    });
  });
}

export async function main() {
  const args = process.argv.slice(2);

  // Parse command line arguments
  const { values } = parseArgs({
    args,
    options: {
      stdio: { type: "boolean", default: false },
      port: { type: "string", short: "p" },
      host: { type: "string", default: "127.0.0.1" },
      token: { type: "string" },
      "gateway-url": { type: "string" },
      "gateway-token": { type: "string" },
      debug: { type: "boolean", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
    allowPositionals: true,
  });

  // Enable debug mode
  if (values.debug || process.env.OPENCLAW_DEBUG === "true" || process.env.OPENCLAW_DEBUG === "1") {
    setDebug(true);
    console.error("[debug] Debug mode enabled");
  }

  if (values.help) {
    printHelp();
    process.exit(0);
  }

  // Set environment from CLI args
  if (values["gateway-url"]) {
    process.env.OPENCLAW_GATEWAY_URL = values["gateway-url"];
  }
  if (values["gateway-token"]) {
    process.env.OPENCLAW_GATEWAY_TOKEN = values["gateway-token"];
  }

  const port = values.port ? parseInt(values.port, 10) : undefined;
  const mcpToken = values.token || process.env.OPENCLAW_MCP_TOKEN;

  // HTTP mode
  if (port) {
    await runHttpServer(port, values.host || "127.0.0.1", mcpToken);
    return;
  }

  // Default to stdio mode
  await runStdio();
}

export { OpenClawClient };

// CLI entry point
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});