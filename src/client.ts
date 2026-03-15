import WebSocket from "ws";

export interface OpenClawClientOptions {
  gatewayUrl: string;
  gatewayToken?: string;
  timeout: number;
}

export interface RPCRequest {
  type: "req";
  id: string;
  method: string;
  params?: Record<string, unknown>;
}

export interface RPCResponse<T = unknown> {
  type: "res";
  id: string;
  ok: boolean;
  payload?: T;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export interface BrowserTab {
  targetId: string;
  title: string;
  url: string;
  wsUrl: string;
  type: string;
}

export interface BrowserState {
  enabled: boolean;
  running: boolean;
  cdpReady: boolean;
  cdpPort: number;
  cdpUrl: string;
  tabs: BrowserTab[];
}

let DEBUG = process.env.OPENCLAW_DEBUG === "true" || process.env.OPENCLAW_DEBUG === "1";

export function setDebug(enabled: boolean) {
  DEBUG = enabled;
}

export function isDebug() {
  return DEBUG;
}

export function debugLog(category: string, message: string, data?: unknown) {
  if (!DEBUG) return;
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${category}]`;
  if (data !== undefined) {
    console.error(prefix, message, typeof data === "object" ? JSON.stringify(data, null, 2) : data);
  } else {
    console.error(prefix, message);
  }
}

const GATEWAY_CLIENT_ID = "gateway-client";
const GATEWAY_CLIENT_VERSION = "1.0.0";
const PROTOCOL_VERSION = 3;

export class OpenClawClient {
  private gatewayUrl: string;
  private gatewayToken?: string;
  private timeout: number;
  private ws: WebSocket | null = null;
  private requestId = 0;
  private pendingRequests = new Map<string, {
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }>();
  private connectNonce: string | null = null;
  private connected = false;

  constructor(options: OpenClawClientOptions) {
    this.gatewayUrl = options.gatewayUrl;
    this.gatewayToken = options.gatewayToken;
    this.timeout = options.timeout;
    debugLog("client", `Initialized with gateway: ${this.gatewayUrl}`);
  }

  private async ensureConnection(): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.connected) {
      debugLog("ws", "Connection already established");
      return;
    }

    debugLog("ws", `Connecting to ${this.gatewayUrl}...`);

    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.gatewayUrl);
      const connectionTimeout = setTimeout(() => {
        reject(new Error("Connection timeout"));
        ws.close();
      }, 15000);

      ws.on("open", () => {
        this.ws = ws;
        this.connected = false;
        this.connectNonce = null;
        this.setupMessageHandler();
        debugLog("ws", "WebSocket opened, waiting for connect.challenge...");
      });

      ws.on("error", (error) => {
        clearTimeout(connectionTimeout);
        debugLog("ws", `Connection error: ${error.message}`);
        reject(new Error(`Failed to connect to gateway: ${error.message}`));
      });

      ws.on("close", (code, reason) => {
        clearTimeout(connectionTimeout);
        debugLog("ws", `Connection closed: code=${code}, reason=${reason.toString()}`);
        this.ws = null;
        this.connected = false;
        this.connectNonce = null;
        // Reject all pending requests
        for (const [id, pending] of this.pendingRequests) {
          clearTimeout(pending.timeout);
          pending.reject(new Error("Connection closed"));
          this.pendingRequests.delete(id);
        }
      });

      // Wait for connection to be established (after handshake)
      const checkConnected = () => {
        if (this.connected) {
          clearTimeout(connectionTimeout);
          resolve();
        } else if (!ws || ws.readyState !== WebSocket.OPEN) {
          clearTimeout(connectionTimeout);
          reject(new Error("Connection closed during handshake"));
        } else {
          setTimeout(checkConnected, 50);
        }
      };

      // Start checking after a short delay
      setTimeout(checkConnected, 100);
    });
  }

  private setupMessageHandler() {
    if (!this.ws) return;

    this.ws.on("message", (data: Buffer) => {
      try {
        const rawResponse = data.toString();
        debugLog("rpc", "Raw response received", rawResponse);

        const parsed = JSON.parse(rawResponse);

        // Handle gateway events
        if (parsed.type === "event") {
          this.handleEvent(parsed);
          return;
        }

        // Handle JSON-RPC responses
        if (parsed.type === "res") {
          const pending = this.pendingRequests.get(parsed.id);

          if (pending) {
            clearTimeout(pending.timeout);
            this.pendingRequests.delete(parsed.id);

            if (!parsed.ok || parsed.error) {
              pending.reject(new Error(parsed.error?.message || "Unknown error"));
            } else {
              pending.resolve(parsed.payload);
            }
          } else {
            debugLog("rpc", `No pending request found for id #${parsed.id}`);
          }
        }
      } catch (error) {
        debugLog("rpc", "Failed to parse response", { error: String(error), raw: data.toString() });
        console.error("Failed to parse response:", error);
      }
    });
  }

  private handleEvent(evt: { event: string; payload?: unknown }) {
    debugLog("ws", `Received event: ${evt.event}`, evt.payload);

    if (evt.event === "connect.challenge") {
      const payload = evt.payload as { nonce?: unknown; ts?: unknown } | undefined;
      const nonce = payload && typeof payload.nonce === "string" ? payload.nonce : null;

      if (!nonce) {
        debugLog("ws", "connect.challenge missing nonce");
        this.ws?.close(1008, "connect challenge missing nonce");
        return;
      }

      this.connectNonce = nonce;
      debugLog("ws", `Received connect.challenge, nonce: ${nonce}`);
      this.sendConnect();
    }
  }

  private sendConnect() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      debugLog("ws", "Cannot send connect: WebSocket not open");
      return;
    }

    const nonce = this.connectNonce;
    if (!nonce) {
      debugLog("ws", "Cannot send connect: no nonce");
      return;
    }

    const auth = this.gatewayToken ? { token: this.gatewayToken } : undefined;

    const params = {
      minProtocol: PROTOCOL_VERSION,
      maxProtocol: PROTOCOL_VERSION,
      client: {
        id: GATEWAY_CLIENT_ID,
        displayName: "OpenClaw MCP Server",
        version: GATEWAY_CLIENT_VERSION,
        platform: process.platform,
        mode: "backend",
      },
      role: "operator",
      scopes: ["operator.read", "operator.write", "operator.admin"],
      caps: [],
      auth,
    };

    debugLog("ws", "Sending connect request", params);

    this.requestInternal("connect", params)
      .then((result) => {
        debugLog("ws", "Connect successful", result);
        this.connected = true;
      })
      .catch((error) => {
        debugLog("ws", `Connect failed: ${error.message}`);
        this.ws?.close(1008, `connect failed: ${error.message}`);
      });
  }

  private async requestInternal<T = unknown>(method: string, params?: Record<string, unknown>): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error("WebSocket not connected"));
        return;
      }

      const id = `mcp-${++this.requestId}`;
      const request: RPCRequest = {
        type: "req",
        id,
        method,
        params,
      };

      debugLog("rpc", `Sending request ${id}: ${method}`, params);

      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        debugLog("rpc", `Request ${id} timed out after ${this.timeout}ms`);
        reject(new Error(`Request timeout: ${method}`));
      }, this.timeout);

      this.pendingRequests.set(id, {
        resolve: (value) => resolve(value as T),
        reject,
        timeout,
      });

      this.ws.send(JSON.stringify(request));
    });
  }

  async call<T = unknown>(method: string, params?: Record<string, unknown>): Promise<T> {
    await this.ensureConnection();
    return this.requestInternal<T>(method, params);
  }

  async disconnect(): Promise<void> {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.connected = false;
      this.connectNonce = null;
    }
  }

  // Gateway methods
  async getHealth() {
    return this.call("health");
  }

  async getConfig() {
    return this.call("config.get");
  }

  // Session methods
  async listSessions() {
    return this.call("sessions.list");
  }

  async getSession(sessionId: string) {
    return this.call("sessions.get", { sessionId });
  }

  async resetSession(sessionId: string) {
    return this.call("sessions.reset", { sessionId });
  }

  async compactSession(sessionId: string) {
    return this.call("sessions.compact", { sessionId });
  }

  // Agent methods
  async listAgents() {
    return this.call("agents.list");
  }

  async sendMessage(params: {
    message: string;
    sessionId?: string;
    agent?: string;
    to?: string;
    channel?: string;
    accountId?: string;
    thinking?: string;
    deliver?: boolean;
  }) {
    const idempotencyKey = `mcp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    return this.call("agent", { ...params, idempotencyKey });
  }

  async runAgent(params: {
    message: string;
    sessionId?: string;
    agent?: string;
    thinking?: string;
  }) {
    return this.call("agent.run", params);
  }

  // Channel methods
  async listChannels() {
    return this.call("channels.status");
  }

  async getChannelStatus(channel: string) {
    return this.call("channels.status", { channel });
  }

  async sendChannelMessage(params: {
    channel: string;
    to: string;
    message: string;
    accountId?: string;
  }) {
    const idempotencyKey = `mcp-send-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    return this.call("send", { ...params, idempotencyKey });
  }

  // Node methods
  async listNodes() {
    return this.call("node.list");
  }

  async getNodeInfo(nodeId: string) {
    return this.call("node.describe", { nodeId });
  }

  async invokeNode(nodeId: string, command: string, params?: Record<string, unknown>) {
    const idempotencyKey = `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    return this.call("node.invoke", { idempotencyKey, nodeId, command, params });
  }

  // Memory methods
  async searchMemory(query: string, limit?: number) {
    return this.call("memory.search", { query, limit });
  }

  async indexMemory() {
    return this.call("memory.index");
  }

  // Cron methods
  async listCronJobs() {
    return this.call("cron.list");
  }

  async createCronJob(params: {
    name: string;
    cron: string;
    prompt: string;
    sessionId?: string;
  }) {
    return this.call("cron.create", params);
  }

  async deleteCronJob(jobId: string) {
    return this.call("cron.delete", { jobId });
  }

  // Browser methods - uses CDP (Chrome DevTools Protocol) for control
  private browserNodeId: string | null = null;
  private cdpPort: number | null = null;
  private cdpWs: WebSocket | null = null;
  private cdpRequestId = 0;

  async getBrowserNodeId(): Promise<string | null> {
    if (this.browserNodeId) return this.browserNodeId;

    const result = await this.call<{ nodes?: Array<{ nodeId: string; caps?: string[] }> }>("node.list");
    const nodes = result?.nodes || [];

    // Find a node with browser capability
    const browserNode = nodes.find(n => n.caps?.includes("browser"));
    if (browserNode) {
      this.browserNodeId = browserNode.nodeId;
      return this.browserNodeId;
    }
    return null;
  }

  private async getBrowserInfo(): Promise<{ cdpPort: number; tabs: BrowserTab[] } | null> {
    const nodeId = await this.getBrowserNodeId();
    if (!nodeId) return null;

    const idempotencyKey = `browser-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Get browser state
    const stateResult = await this.call<{ payload?: { result?: { cdpPort?: number; running?: boolean } } }>("node.invoke", {
      idempotencyKey,
      nodeId,
      command: "browser.proxy",
      params: { path: "/" }
    });

    const cdpPort = stateResult?.payload?.result?.cdpPort;
    if (!cdpPort) return null;
    this.cdpPort = cdpPort;

    // Get tabs
    const idempotencyKey2 = `browser-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const tabsResult = await this.call<{ payload?: { result?: { tabs?: BrowserTab[] } } }>("node.invoke", {
      idempotencyKey: idempotencyKey2,
      nodeId,
      command: "browser.proxy",
      params: { path: "/tabs" }
    });

    const tabs = tabsResult?.payload?.result?.tabs || [];

    return { cdpPort, tabs };
  }

  private async sendCDPCommand(targetId: string, method: string, params?: Record<string, unknown>): Promise<unknown> {
    return new Promise((resolve, reject) => {
      if (!this.cdpPort) {
        reject(new Error("CDP port not available"));
        return;
      }

      const wsUrl = `ws://127.0.0.1:${this.cdpPort}/devtools/page/${targetId}`;
      const ws = new WebSocket(wsUrl);
      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error("CDP connection timeout"));
      }, 30000);

      ws.on("open", () => {
        ws.send(JSON.stringify({
          id: ++this.cdpRequestId,
          method,
          params
        }));
      });

      ws.on("message", (data) => {
        try {
          const response = JSON.parse(data.toString());
          clearTimeout(timeout);
          ws.close();
          if (response.error) {
            reject(new Error(response.error.message));
          } else {
            resolve(response.result);
          }
        } catch (e) {
          clearTimeout(timeout);
          ws.close();
          reject(e);
        }
      });

      ws.on("error", (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
  }

  async getBrowserState(): Promise<BrowserState | { available: false; message: string }> {
    try {
      const info = await this.getBrowserInfo();
      if (!info) {
        return { available: false, message: "No browser node available" };
      }
      return {
        enabled: true,
        running: true,
        cdpReady: true,
        cdpPort: info.cdpPort,
        cdpUrl: `http://127.0.0.1:${info.cdpPort}`,
        tabs: info.tabs
      };
    } catch (e) {
      return { available: false, message: e instanceof Error ? e.message : String(e) };
    }
  }

  async browserNavigate(url: string, targetId?: string): Promise<unknown> {
    const info = await this.getBrowserInfo();
    if (!info) {
      throw new Error("No browser available");
    }

    // Use first page tab if no targetId specified
    const tab = targetId
      ? info.tabs.find(t => t.targetId === targetId)
      : info.tabs.find(t => t.type === "page" && !t.url.startsWith("chrome://") && !t.url.startsWith("chrome-extension://"));

    if (!tab) {
      throw new Error("No suitable browser tab found");
    }

    return this.sendCDPCommand(tab.targetId, "Page.navigate", { url });
  }

  async browserScreenshot(fullPage = false, targetId?: string): Promise<{ data: string }> {
    const info = await this.getBrowserInfo();
    if (!info) {
      throw new Error("No browser available");
    }

    const tab = targetId
      ? info.tabs.find(t => t.targetId === targetId)
      : info.tabs.find(t => t.type === "page" && !t.url.startsWith("chrome://") && !t.url.startsWith("chrome-extension://"));

    if (!tab) {
      throw new Error("No suitable browser tab found");
    }

    const result = await this.sendCDPCommand(tab.targetId, "Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: fullPage
    }) as { data: string };

    return result;
  }

  async browserClick(selector: string, targetId?: string): Promise<unknown> {
    const info = await this.getBrowserInfo();
    if (!info) {
      throw new Error("No browser available");
    }

    const tab = targetId
      ? info.tabs.find(t => t.targetId === targetId)
      : info.tabs.find(t => t.type === "page" && !t.url.startsWith("chrome://") && !t.url.startsWith("chrome-extension://"));

    if (!tab) {
      throw new Error("No suitable browser tab found");
    }

    // Use Runtime.evaluate to click
    return this.sendCDPCommand(tab.targetId, "Runtime.evaluate", {
      expression: `document.querySelector('${selector}').click()`
    });
  }

  async browserType(selector: string, text: string, targetId?: string): Promise<unknown> {
    const info = await this.getBrowserInfo();
    if (!info) {
      throw new Error("No browser available");
    }

    const tab = targetId
      ? info.tabs.find(t => t.targetId === targetId)
      : info.tabs.find(t => t.type === "page" && !t.url.startsWith("chrome://") && !t.url.startsWith("chrome-extension://"));

    if (!tab) {
      throw new Error("No suitable browser tab found");
    }

    // Use Runtime.evaluate to type
    const escapedText = text.replace(/'/g, "\\'");
    return this.sendCDPCommand(tab.targetId, "Runtime.evaluate", {
      expression: `document.querySelector('${selector}').value = '${escapedText}'`
    });
  }

  async browserEvaluate(script: string, targetId?: string): Promise<unknown> {
    const info = await this.getBrowserInfo();
    if (!info) {
      throw new Error("No browser available");
    }

    const tab = targetId
      ? info.tabs.find(t => t.targetId === targetId)
      : info.tabs.find(t => t.type === "page" && !t.url.startsWith("chrome://") && !t.url.startsWith("chrome-extension://"));

    if (!tab) {
      throw new Error("No suitable browser tab found");
    }

    return this.sendCDPCommand(tab.targetId, "Runtime.evaluate", {
      expression: script,
      returnByValue: true
    });
  }

  // Deprecated: Use specific browser methods instead
  async browserAction(action: string, params?: Record<string, unknown>) {
    switch (action) {
      case "navigate":
        return this.browserNavigate(params?.url as string, params?.targetId as string);
      case "screenshot":
        return this.browserScreenshot(params?.fullPage as boolean, params?.targetId as string);
      case "click":
        return this.browserClick(params?.selector as string, params?.targetId as string);
      case "type":
        return this.browserType(params?.selector as string, params?.text as string, params?.targetId as string);
      case "evaluate":
        return this.browserEvaluate(params?.script as string, params?.targetId as string);
      default:
        throw new Error(`Unknown browser action: ${action}`);
    }
  }

  // Config methods
  async updateConfig(updates: Record<string, unknown>) {
    return this.call("config.patch", { updates });
  }

  async validateConfig() {
    return this.call("config.validate");
  }

  // Hooks methods
  async listHooks() {
    return this.call("hooks.list");
  }

  async triggerHook(hookName: string, payload?: unknown) {
    return this.call("hooks.trigger", { hookName, payload });
  }

  // Models methods
  async listModels() {
    return this.call("models.list");
  }

  async scanModels() {
    return this.call("models.scan");
  }

  // Pairing methods
  async listPairingRequests() {
    return this.call("pairing.list");
  }

  async approvePairing(channel: string, code: string) {
    return this.call("pairing.approve", { channel, code });
  }

  async rejectPairing(channel: string, code: string) {
    return this.call("pairing.reject", { channel, code });
  }
}