import { Tool } from "@modelcontextprotocol/sdk/types.js";

// Agent tools
export const agentTools: Tool[] = [
  {
    name: "openclaw_agent_send",
    description: "Send a message to the OpenClaw agent and get a response. This is the primary way to interact with your AI assistant. The agent can help with tasks, answer questions, and execute tools.",
    inputSchema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          description: "The message to send to the agent",
        },
        session_id: {
          type: "string",
          description: "Optional session ID to continue an existing conversation",
        },
        agent: {
          type: "string",
          description: "Optional agent ID to use a specific agent/workspace",
        },
        thinking: {
          type: "string",
          enum: ["off", "minimal", "low", "medium", "high"],
          description: "Thinking level for supported models (Claude, GPT-5, etc.)",
        },
        deliver: {
          type: "boolean",
          description: "Whether to deliver the response back to a channel",
        },
        channel: {
          type: "string",
          description: "Channel to deliver the response to (if deliver is true)",
        },
        to: {
          type: "string",
          description: "Recipient to deliver the response to (if deliver is true)",
        },
        account_id: {
          type: "string",
          description: "Account ID for multi-account channels (e.g., feishu account)",
        },
      },
      required: ["message"],
    },
  },
  {
    name: "openclaw_agent_list",
    description: "List all configured agents/workspaces in OpenClaw. Shows agent IDs, names, models, and routing bindings.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "openclaw_agent_add",
    description: "Add a new isolated agent/workspace with optional routing bindings.",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Name for the new agent",
        },
        workspace: {
          type: "string",
          description: "Workspace directory path for the agent",
        },
        model: {
          type: "string",
          description: "Model ID for this agent (e.g., anthropic/claude-opus-4-6)",
        },
        bindings: {
          type: "array",
          items: { type: "string" },
          description: "Channel bindings for routing (e.g., ['telegram', 'discord:account1'])",
        },
      },
      required: ["name"],
    },
  },
  {
    name: "openclaw_agent_set_identity",
    description: "Update an agent's identity (name, theme, emoji, avatar).",
    inputSchema: {
      type: "object",
      properties: {
        agent: {
          type: "string",
          description: "Agent ID to update",
        },
        name: {
          type: "string",
          description: "New name for the agent",
        },
        theme: {
          type: "string",
          description: "Theme color for the agent",
        },
        emoji: {
          type: "string",
          description: "Emoji for the agent",
        },
        avatar: {
          type: "string",
          description: "Avatar path, URL, or data URI",
        },
      },
      required: ["agent"],
    },
  },
  {
    name: "openclaw_agent_delete",
    description: "Delete an agent and its associated workspace/state.",
    inputSchema: {
      type: "object",
      properties: {
        agent_id: {
          type: "string",
          description: "Agent ID to delete",
        },
        force: {
          type: "boolean",
          description: "Skip confirmation prompt",
        },
      },
      required: ["agent_id"],
    },
  },
  {
    name: "openclaw_agent_bind",
    description: "Add routing bindings to an agent for specific channels.",
    inputSchema: {
      type: "object",
      properties: {
        agent: {
          type: "string",
          description: "Agent ID to bind",
        },
        bindings: {
          type: "array",
          items: { type: "string" },
          description: "Channel bindings to add (e.g., ['telegram', 'slack:bot1'])",
        },
      },
      required: ["bindings"],
    },
  },
  {
    name: "openclaw_agent_unbind",
    description: "Remove routing bindings from an agent.",
    inputSchema: {
      type: "object",
      properties: {
        agent: {
          type: "string",
          description: "Agent ID to unbind",
        },
        bindings: {
          type: "array",
          items: { type: "string" },
          description: "Channel bindings to remove",
        },
        all: {
          type: "boolean",
          description: "Remove all bindings for this agent",
        },
      },
    },
  },
];

// Message tools
export const messageTools: Tool[] = [
  {
    name: "openclaw_message_send",
    description: "Send a message directly to a specific channel (WhatsApp, Telegram, Slack, Discord, etc.) without going through the agent.",
    inputSchema: {
      type: "object",
      properties: {
        channel: {
          type: "string",
          description: "Channel to send via (telegram, whatsapp, slack, discord, signal, etc.)",
        },
        to: {
          type: "string",
          description: "Recipient (phone number, username, channel ID, etc.)",
        },
        message: {
          type: "string",
          description: "Message content to send",
        },
        account_id: {
          type: "string",
          description: "Optional account ID for multi-account channels",
        },
      },
      required: ["channel", "to", "message"],
    },
  },
  {
    name: "openclaw_message_read",
    description: "Read recent messages from a channel/conversation.",
    inputSchema: {
      type: "object",
      properties: {
        channel: {
          type: "string",
          description: "Channel to read from",
        },
        from: {
          type: "string",
          description: "Conversation/peer to read from",
        },
        limit: {
          type: "number",
          description: "Number of messages to retrieve",
        },
      },
      required: ["channel", "from"],
    },
  },
];

// Session tools
export const sessionTools: Tool[] = [
  {
    name: "openclaw_session_list",
    description: "List all conversation sessions, showing recent activity and metadata.",
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Maximum number of sessions to return",
        },
      },
    },
  },
  {
    name: "openclaw_session_get",
    description: "Get details about a specific session including message count, token usage, and configuration.",
    inputSchema: {
      type: "object",
      properties: {
        session_id: {
          type: "string",
          description: "Session ID to retrieve",
        },
      },
      required: ["session_id"],
    },
  },
  {
    name: "openclaw_session_reset",
    description: "Reset/clear a session's conversation history and context.",
    inputSchema: {
      type: "object",
      properties: {
        session_id: {
          type: "string",
          description: "Session ID to reset",
        },
      },
      required: ["session_id"],
    },
  },
  {
    name: "openclaw_session_compact",
    description: "Compact a session's context by summarizing older messages to save tokens.",
    inputSchema: {
      type: "object",
      properties: {
        session_id: {
          type: "string",
          description: "Session ID to compact",
        },
      },
      required: ["session_id"],
    },
  },
  {
    name: "openclaw_session_history",
    description: "Get the message history for a session.",
    inputSchema: {
      type: "object",
      properties: {
        session_id: {
          type: "string",
          description: "Session ID to get history for",
        },
        limit: {
          type: "number",
          description: "Number of messages to retrieve",
        },
      },
      required: ["session_id"],
    },
  },
];

// Channel tools
export const channelTools: Tool[] = [
  {
    name: "openclaw_channel_list",
    description: "List all configured messaging channels and their connection status.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "openclaw_channel_status",
    description: "Get detailed status for a specific channel including health, credentials, and configuration.",
    inputSchema: {
      type: "object",
      properties: {
        channel: {
          type: "string",
          description: "Channel name (telegram, whatsapp, slack, discord, etc.)",
        },
      },
      required: ["channel"],
    },
  },
  {
    name: "openclaw_channel_login",
    description: "Initiate login/authentication for a channel (e.g., WhatsApp QR code).",
    inputSchema: {
      type: "object",
      properties: {
        channel: {
          type: "string",
          description: "Channel to login to",
        },
      },
      required: ["channel"],
    },
  },
  {
    name: "openclaw_channel_logout",
    description: "Logout/disconnect from a channel.",
    inputSchema: {
      type: "object",
      properties: {
        channel: {
          type: "string",
          description: "Channel to logout from",
        },
      },
      required: ["channel"],
    },
  },
];

// Node tools
export const nodeTools: Tool[] = [
  {
    name: "openclaw_node_list",
    description: "List all connected device nodes (macOS, iOS, Android devices paired with the gateway).",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "openclaw_node_info",
    description: "Get detailed information about a specific node including capabilities and permissions.",
    inputSchema: {
      type: "object",
      properties: {
        node_id: {
          type: "string",
          description: "Node ID to get info for",
        },
      },
      required: ["node_id"],
    },
  },
  {
    name: "openclaw_node_camera",
    description: "Take a photo with a node's camera.",
    inputSchema: {
      type: "object",
      properties: {
        node_id: {
          type: "string",
          description: "Node ID to use",
        },
        camera: {
          type: "string",
          enum: ["front", "back"],
          description: "Which camera to use",
        },
      },
      required: ["node_id"],
    },
  },
  {
    name: "openclaw_node_screen_record",
    description: "Start or stop screen recording on a node.",
    inputSchema: {
      type: "object",
      properties: {
        node_id: {
          type: "string",
          description: "Node ID to use",
        },
        action: {
          type: "string",
          enum: ["start", "stop"],
          description: "Start or stop recording",
        },
        duration: {
          type: "number",
          description: "Recording duration in seconds (for start)",
        },
      },
      required: ["node_id", "action"],
    },
  },
  {
    name: "openclaw_node_notify",
    description: "Send a notification to a node device.",
    inputSchema: {
      type: "object",
      properties: {
        node_id: {
          type: "string",
          description: "Node ID to notify",
        },
        title: {
          type: "string",
          description: "Notification title",
        },
        body: {
          type: "string",
          description: "Notification body",
        },
      },
      required: ["node_id", "title", "body"],
    },
  },
  {
    name: "openclaw_node_run",
    description: "Execute a command on a node (macOS nodes only).",
    inputSchema: {
      type: "object",
      properties: {
        node_id: {
          type: "string",
          description: "Node ID to run on",
        },
        command: {
          type: "string",
          description: "Command to execute",
        },
        cwd: {
          type: "string",
          description: "Working directory",
        },
      },
      required: ["node_id", "command"],
    },
  },
  {
    name: "openclaw_node_location",
    description: "Get the current location from a node device.",
    inputSchema: {
      type: "object",
      properties: {
        node_id: {
          type: "string",
          description: "Node ID to get location from",
        },
      },
      required: ["node_id"],
    },
  },
];

// Memory tools
export const memoryTools: Tool[] = [
  {
    name: "openclaw_memory_search",
    description: "Search through OpenClaw's memory/knowledge base. This includes past conversations, documents, and learned information.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query",
        },
        limit: {
          type: "number",
          description: "Maximum number of results",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "openclaw_memory_index",
    description: "Reindex the memory database. Useful after adding new documents or when search results seem outdated.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "openclaw_memory_add",
    description: "Add content to the memory/knowledge base.",
    inputSchema: {
      type: "object",
      properties: {
        content: {
          type: "string",
          description: "Content to add to memory",
        },
        metadata: {
          type: "object",
          description: "Optional metadata (source, tags, etc.)",
        },
      },
      required: ["content"],
    },
  },
];

// Cron tools
export const cronTools: Tool[] = [
  {
    name: "openclaw_cron_list",
    description: "List all scheduled cron jobs.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "openclaw_cron_create",
    description: "Create a new scheduled cron job that triggers the agent.",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Name for the cron job",
        },
        cron: {
          type: "string",
          description: "Cron expression (e.g., '0 9 * * *' for 9am daily)",
        },
        prompt: {
          type: "string",
          description: "Prompt/message to send to the agent when triggered",
        },
        session_id: {
          type: "string",
          description: "Optional session ID to use for the agent",
        },
        agent: {
          type: "string",
          description: "Optional agent ID to use",
        },
      },
      required: ["name", "cron", "prompt"],
    },
  },
  {
    name: "openclaw_cron_delete",
    description: "Delete a scheduled cron job.",
    inputSchema: {
      type: "object",
      properties: {
        job_id: {
          type: "string",
          description: "Cron job ID to delete",
        },
      },
      required: ["job_id"],
    },
  },
  {
    name: "openclaw_cron_enable",
    description: "Enable a disabled cron job.",
    inputSchema: {
      type: "object",
      properties: {
        job_id: {
          type: "string",
          description: "Cron job ID to enable",
        },
      },
      required: ["job_id"],
    },
  },
  {
    name: "openclaw_cron_disable",
    description: "Disable a cron job temporarily.",
    inputSchema: {
      type: "object",
      properties: {
        job_id: {
          type: "string",
          description: "Cron job ID to disable",
        },
      },
      required: ["job_id"],
    },
  },
];

// Config tools
export const configTools: Tool[] = [
  {
    name: "openclaw_config_get",
    description: "Get the current OpenClaw gateway configuration.",
    inputSchema: {
      type: "object",
      properties: {
        key: {
          type: "string",
          description: "Optional specific config key to get (e.g., 'agent.model')",
        },
      },
    },
  },
  {
    name: "openclaw_config_set",
    description: "Set configuration values in OpenClaw.",
    inputSchema: {
      type: "object",
      properties: {
        key: {
          type: "string",
          description: "Configuration key to set (e.g., 'agent.model')",
        },
        value: {
          description: "Value to set",
        },
      },
      required: ["key", "value"],
    },
  },
  {
    name: "openclaw_config_validate",
    description: "Validate the current configuration and check for errors.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
];

// Gateway tools
export const gatewayTools: Tool[] = [
  {
    name: "openclaw_gateway_health",
    description: "Get the health status of the OpenClaw gateway including uptime, memory usage, and connection counts.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "openclaw_gateway_restart",
    description: "Restart the OpenClaw gateway.",
    inputSchema: {
      type: "object",
      properties: {
        force: {
          type: "boolean",
          description: "Force restart without waiting for pending operations",
        },
      },
    },
  },
  {
    name: "openclaw_gateway_logs",
    description: "Get recent gateway logs for debugging.",
    inputSchema: {
      type: "object",
      properties: {
        lines: {
          type: "number",
          description: "Number of log lines to retrieve",
        },
        level: {
          type: "string",
          enum: ["debug", "info", "warn", "error"],
          description: "Minimum log level",
        },
      },
    },
  },
  {
    name: "openclaw_pairing_list",
    description: "List pending pairing requests from users trying to DM the bot.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "openclaw_pairing_approve",
    description: "Approve a pending pairing request to allow someone to DM the bot.",
    inputSchema: {
      type: "object",
      properties: {
        channel: {
          type: "string",
          description: "Channel the request came from",
        },
        code: {
          type: "string",
          description: "Pairing code to approve",
        },
      },
      required: ["channel", "code"],
    },
  },
  {
    name: "openclaw_pairing_reject",
    description: "Reject a pending pairing request.",
    inputSchema: {
      type: "object",
      properties: {
        channel: {
          type: "string",
          description: "Channel the request came from",
        },
        code: {
          type: "string",
          description: "Pairing code to reject",
        },
      },
      required: ["channel", "code"],
    },
  },
];

// Browser tools
export const browserTools: Tool[] = [
  {
    name: "openclaw_browser_state",
    description: "Get the current state of the OpenClaw browser (tabs, pages, active session).",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "openclaw_browser_navigate",
    description: "Navigate the browser to a URL.",
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "URL to navigate to",
        },
      },
      required: ["url"],
    },
  },
  {
    name: "openclaw_browser_screenshot",
    description: "Take a screenshot of the current browser page.",
    inputSchema: {
      type: "object",
      properties: {
        full_page: {
          type: "boolean",
          description: "Capture the full page instead of viewport",
        },
      },
    },
  },
  {
    name: "openclaw_browser_click",
    description: "Click an element on the page.",
    inputSchema: {
      type: "object",
      properties: {
        selector: {
          type: "string",
          description: "CSS selector for element to click",
        },
      },
      required: ["selector"],
    },
  },
  {
    name: "openclaw_browser_type",
    description: "Type text into an input field.",
    inputSchema: {
      type: "object",
      properties: {
        selector: {
          type: "string",
          description: "CSS selector for input field",
        },
        text: {
          type: "string",
          description: "Text to type",
        },
      },
      required: ["selector", "text"],
    },
  },
  {
    name: "openclaw_browser_evaluate",
    description: "Execute JavaScript in the browser and return the result.",
    inputSchema: {
      type: "object",
      properties: {
        script: {
          type: "string",
          description: "JavaScript code to execute",
        },
      },
      required: ["script"],
    },
  },
];