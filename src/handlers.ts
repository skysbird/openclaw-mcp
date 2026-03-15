import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { OpenClawClient, debugLog } from "./client.js";

function success(data: unknown): CallToolResult {
  return {
    content: [
      {
        type: "text",
        text: typeof data === "string" ? data : JSON.stringify(data, null, 2),
      },
    ],
  };
}

function error(message: string): CallToolResult {
  return {
    content: [
      {
        type: "text",
        text: `Error: ${message}`,
      },
    ],
    isError: true,
  };
}

function logToolResult(toolName: string, startTime: number, success: boolean) {
  const elapsed = Date.now() - startTime;
  debugLog("tool", `${success ? "Completed" : "Failed"}: ${toolName} (${elapsed}ms)`);
}

export async function handleToolCall(
  toolName: string,
  args: Record<string, unknown>,
  client: OpenClawClient
): Promise<CallToolResult> {
  debugLog("tool", `Calling: ${toolName}`, args);
  const startTime = Date.now();

  try {
    switch (toolName) {
      // Agent tools
      case "openclaw_agent_send": {
        const idempotencyKey = `mcp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const result = await client.sendMessage({
          message: args.message as string,
          sessionId: args.session_id as string | undefined,
          agent: args.agent as string | undefined,
          thinking: args.thinking as string | undefined,
          deliver: args.deliver as boolean | undefined,
          channel: args.channel as string | undefined,
          to: args.to as string | undefined,
          accountId: args.account_id as string | undefined,
        });
        return success(result);
      }

      case "openclaw_agent_list": {
        const result = await client.listAgents();
        return success(result);
      }

      case "openclaw_agent_add": {
        const result = await client.call("agents.add", {
          name: args.name,
          workspace: args.workspace,
          model: args.model,
          bindings: args.bindings,
        });
        return success(result);
      }

      case "openclaw_agent_set_identity": {
        const result = await client.call("agents.setIdentity", {
          agent: args.agent,
          name: args.name,
          theme: args.theme,
          emoji: args.emoji,
          avatar: args.avatar,
        });
        return success(result);
      }

      case "openclaw_agent_delete": {
        const result = await client.call("agents.delete", {
          id: args.agent_id,
          force: args.force,
        });
        return success(result);
      }

      case "openclaw_agent_bind": {
        const result = await client.call("agents.bind", {
          agent: args.agent,
          bindings: args.bindings,
        });
        return success(result);
      }

      case "openclaw_agent_unbind": {
        const result = await client.call("agents.unbind", {
          agent: args.agent,
          bindings: args.bindings,
          all: args.all,
        });
        return success(result);
      }

      // Message tools
      case "openclaw_message_send": {
        const result = await client.sendChannelMessage({
          channel: args.channel as string,
          to: args.to as string,
          message: args.message as string,
          accountId: args.account_id as string | undefined,
        });
        return success(result);
      }

      case "openclaw_message_read": {
        const result = await client.call("message.read", {
          channel: args.channel,
          from: args.from,
          limit: args.limit,
        });
        return success(result);
      }

      // Session tools
      case "openclaw_session_list": {
        const result = await client.listSessions();
        return success(result);
      }

      case "openclaw_session_get": {
        const result = await client.getSession(args.session_id as string);
        return success(result);
      }

      case "openclaw_session_reset": {
        const result = await client.resetSession(args.session_id as string);
        return success(result);
      }

      case "openclaw_session_compact": {
        const result = await client.compactSession(args.session_id as string);
        return success(result);
      }

      case "openclaw_session_history": {
        const result = await client.call("sessions.history", {
          sessionId: args.session_id,
          limit: args.limit,
        });
        return success(result);
      }

      // Channel tools
      case "openclaw_channel_list": {
        const result = await client.listChannels();
        return success(result);
      }

      case "openclaw_channel_status": {
        const result = await client.getChannelStatus(args.channel as string);
        return success(result);
      }

      case "openclaw_channel_login": {
        const result = await client.call("channels.login", {
          channel: args.channel,
        });
        return success(result);
      }

      case "openclaw_channel_logout": {
        const result = await client.call("channels.logout", {
          channel: args.channel,
        });
        return success(result);
      }

      // Node tools
      case "openclaw_node_list": {
        const result = await client.listNodes();
        return success(result);
      }

      case "openclaw_node_info": {
        const result = await client.getNodeInfo(args.node_id as string);
        return success(result);
      }

      case "openclaw_node_camera": {
        const result = await client.invokeNode(
          args.node_id as string,
          "camera.snap",
          { camera: args.camera }
        );
        return success(result);
      }

      case "openclaw_node_screen_record": {
        const command = args.action === "start" ? "screen.record.start" : "screen.record.stop";
        const result = await client.invokeNode(
          args.node_id as string,
          command,
          { duration: args.duration }
        );
        return success(result);
      }

      case "openclaw_node_notify": {
        const result = await client.invokeNode(
          args.node_id as string,
          "system.notify",
          { title: args.title, body: args.body }
        );
        return success(result);
      }

      case "openclaw_node_run": {
        const result = await client.invokeNode(
          args.node_id as string,
          "system.run",
          { command: args.command, cwd: args.cwd }
        );
        return success(result);
      }

      case "openclaw_node_location": {
        const result = await client.invokeNode(
          args.node_id as string,
          "location.get",
          {}
        );
        return success(result);
      }

      // Memory tools
      case "openclaw_memory_search": {
        const result = await client.searchMemory(
          args.query as string,
          args.limit as number | undefined
        );
        return success(result);
      }

      case "openclaw_memory_index": {
        const result = await client.indexMemory();
        return success(result);
      }

      case "openclaw_memory_add": {
        const result = await client.call("memory.add", {
          content: args.content,
          metadata: args.metadata,
        });
        return success(result);
      }

      // Cron tools
      case "openclaw_cron_list": {
        const result = await client.listCronJobs();
        return success(result);
      }

      case "openclaw_cron_create": {
        const result = await client.createCronJob({
          name: args.name as string,
          cron: args.cron as string,
          prompt: args.prompt as string,
          sessionId: args.session_id as string | undefined,
        });
        return success(result);
      }

      case "openclaw_cron_delete": {
        const result = await client.deleteCronJob(args.job_id as string);
        return success(result);
      }

      case "openclaw_cron_enable": {
        const result = await client.call("cron.enable", { jobId: args.job_id });
        return success(result);
      }

      case "openclaw_cron_disable": {
        const result = await client.call("cron.disable", { jobId: args.job_id });
        return success(result);
      }

      // Config tools
      case "openclaw_config_get": {
        if (args.key) {
          const result = await client.call("config.get", { key: args.key });
          return success(result);
        }
        const result = await client.getConfig();
        return success(result);
      }

      case "openclaw_config_set": {
        const result = await client.updateConfig({ [args.key as string]: args.value });
        return success(result);
      }

      case "openclaw_config_validate": {
        const result = await client.validateConfig();
        return success(result);
      }

      // Gateway tools
      case "openclaw_gateway_health": {
        const result = await client.getHealth();
        return success(result);
      }

      case "openclaw_gateway_restart": {
        const result = await client.call("gateway.restart", { force: args.force });
        return success(result);
      }

      case "openclaw_gateway_logs": {
        const result = await client.call("gateway.logs", {
          lines: args.lines,
          level: args.level,
        });
        return success(result);
      }

      case "openclaw_pairing_list": {
        const result = await client.listPairingRequests();
        return success(result);
      }

      case "openclaw_pairing_approve": {
        const result = await client.approvePairing(
          args.channel as string,
          args.code as string
        );
        return success(result);
      }

      case "openclaw_pairing_reject": {
        const result = await client.rejectPairing(
          args.channel as string,
          args.code as string
        );
        return success(result);
      }

      // Browser tools
      case "openclaw_browser_state": {
        const result = await client.getBrowserState();
        return success(result);
      }

      case "openclaw_browser_navigate": {
        const result = await client.browserAction("navigate", { url: args.url });
        return success(result);
      }

      case "openclaw_browser_screenshot": {
        const result = await client.browserAction("screenshot", { fullPage: args.full_page });
        return success(result);
      }

      case "openclaw_browser_click": {
        const result = await client.browserAction("click", { selector: args.selector });
        return success(result);
      }

      case "openclaw_browser_type": {
        const result = await client.browserAction("type", { selector: args.selector, text: args.text });
        return success(result);
      }

      case "openclaw_browser_evaluate": {
        const result = await client.browserAction("evaluate", { script: args.script });
        return success(result);
      }

      default:
        return error(`Unknown tool: ${toolName}`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    debugLog("tool", `Error in ${toolName}: ${message}`);
    return error(message);
  }
}