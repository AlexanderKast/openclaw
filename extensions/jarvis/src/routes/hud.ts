/**
 * HTTP routes for the Jarvis web HUD.
 *
 * Ported (as skeletons returning 501) from jarvis-assistant/src/routes/*.ts.
 * Full handler implementations will land in phase 4b — for now each route
 * validates the bearer token, logs the call, and returns
 * `{ status: "not_implemented", route }` so the HUD can wire up and we can
 * verify registration + auth end-to-end.
 *
 * All routes are protected by `Authorization: Bearer <JARVIS_WEB_TOKEN>`
 * (env). When the env is not set, the routes reject every request with 503
 * instead of opening a hole.
 *
 * TODO(phase-4): port the real handlers from jarvis-assistant/src/routes/
 *   - chat.ts    → streaming SSE via api.runtime.subagent
 *   - tts.ts     → api.runtime.speech / ElevenLabs connector
 *   - system.ts  → api.logger / metrics
 *   - agents.ts  → api.runtime.subagent.run
 *   - memory.ts  → api.runtime.memory
 *   - engine.ts  → engine sub-agent
 *   - calendar.ts→ calendar tools
 *   - analyst.ts → analyst sub-agent
 */

import type { IncomingMessage, ServerResponse } from "node:http";
import type { OpenClawPluginApi } from "openclaw/plugin-sdk/plugin-entry";
import { createStoreMemoryTool } from "../tools/memory/store-memory.js";
import { createRetrieveMemoryTool } from "../tools/memory/retrieve-memory.js";
import { createSearchMemoryTool } from "../tools/memory/search-memory.js";

const PLUGIN_VERSION = "0.1.0";
const TOOL_COUNT = 53;
const STARTED_AT = Date.now();

async function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data) as Record<string, unknown>);
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

// These SDK types aren't re-exported from any public subpath — we inline them.
type OpenClawPluginHttpRouteHandler = (
  req: IncomingMessage,
  res: ServerResponse,
) => Promise<boolean | void> | boolean | void;
type OpenClawPluginHttpRouteParams = {
  path: string;
  handler: OpenClawPluginHttpRouteHandler;
  auth: "gateway" | "plugin";
  match?: "exact" | "prefix";
  replaceExisting?: boolean;
};

type RouteSpec = {
  method: "GET" | "POST";
  path: string;
  label: string;
};

const HUD_ROUTES: RouteSpec[] = [
  { method: "POST", path: "/plugins/jarvis/api/chat", label: "chat" },
  { method: "POST", path: "/plugins/jarvis/api/tts", label: "tts" },
  { method: "GET", path: "/plugins/jarvis/api/system", label: "system" },
  { method: "POST", path: "/plugins/jarvis/api/agents", label: "agents" },
  { method: "POST", path: "/plugins/jarvis/api/memory", label: "memory" },
  { method: "POST", path: "/plugins/jarvis/api/engine", label: "engine" },
  { method: "GET", path: "/plugins/jarvis/api/calendar", label: "calendar" },
  { method: "POST", path: "/plugins/jarvis/api/analyst", label: "analyst" },
];

// Memory tool singletons for direct HTTP invocation (bypassing the LLM).
const memoryTools = {
  store: createStoreMemoryTool(),
  retrieve: createRetrieveMemoryTool(),
  search: createSearchMemoryTool(),
};

function readBearerToken(req: IncomingMessage): string | null {
  const header = req.headers["authorization"];
  if (!header || typeof header !== "string") return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

function writeJson(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

function createHudHandler(
  spec: RouteSpec,
  api: OpenClawPluginApi,
): OpenClawPluginHttpRouteHandler {
  return async (req, res) => {
    // Method guard
    if (req.method !== spec.method) {
      writeJson(res, 405, { error: "method_not_allowed", expected: spec.method });
      return true;
    }

    // Bearer token auth
    const expected = process.env.JARVIS_WEB_TOKEN?.trim();
    if (!expected) {
      api.logger?.warn?.(
        `[jarvis:hud] ${spec.label} rejected — JARVIS_WEB_TOKEN env not set`,
      );
      writeJson(res, 503, { error: "hud_disabled", reason: "JARVIS_WEB_TOKEN not set" });
      return true;
    }
    const token = readBearerToken(req);
    if (!token || token !== expected) {
      writeJson(res, 401, { error: "unauthorized" });
      return true;
    }

    api.logger?.info?.(`[jarvis:hud] ${spec.method} ${spec.path}`);

    try {
      switch (spec.label) {
        case "system": {
          writeJson(res, 200, {
            status: "ok",
            plugin: "jarvis",
            version: PLUGIN_VERSION,
            tools: TOOL_COUNT,
            uptime: process.uptime(),
            startedAt: STARTED_AT,
          });
          return true;
        }
        case "chat": {
          const body = await readJsonBody(req);
          const message = typeof body.message === "string" ? body.message : "";
          const userId = typeof body.userId === "string" ? body.userId : "web";
          if (!message.trim()) {
            writeJson(res, 400, { error: "missing_message" });
            return true;
          }
          const { runId } = await api.runtime.subagent.run({
            sessionKey: `jarvis-core:${userId}`,
            message,
            deliver: false,
          });
          writeJson(res, 200, { runId });
          return true;
        }
        case "engine": {
          const { runId } = await api.runtime.subagent.run({
            sessionKey: "jarvis-engine:manual",
            message: "Ejecuta el motor diario de contenido",
            deliver: false,
          });
          writeJson(res, 200, { runId });
          return true;
        }
        case "memory": {
          const body = await readJsonBody(req);
          const action = typeof body.action === "string" ? body.action : "";
          let tool;
          let params: Record<string, unknown>;
          if (action === "store") {
            tool = memoryTools.store;
            params = {
              key: body.key,
              value: body.value,
              namespace: body.namespace,
            };
          } else if (action === "retrieve") {
            tool = memoryTools.retrieve;
            params = { key: body.key, namespace: body.namespace };
          } else if (action === "search") {
            tool = memoryTools.search;
            params = { query: body.query, namespace: body.namespace };
          } else {
            writeJson(res, 400, {
              error: "invalid_action",
              expected: ["store", "retrieve", "search"],
            });
            return true;
          }
          const result = await tool.execute(`hud-${Date.now()}`, params);
          writeJson(res, 200, { action, result });
          return true;
        }
        default: {
          // tts, agents, calendar, analyst — pending in phase 4b
          writeJson(res, 501, {
            status: "not_implemented",
            route: spec.label,
            note: "Pending port from jarvis-assistant/src/routes",
          });
          return true;
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      api.logger?.error?.(`[jarvis:hud] ${spec.label} failed: ${message}`);
      writeJson(res, 500, { error: "internal_error", message });
      return true;
    }
  };
}

/**
 * Build the full set of HTTP route params to hand to `api.registerHttpRoute`.
 */
export function buildHudRoutes(
  api: OpenClawPluginApi,
): OpenClawPluginHttpRouteParams[] {
  return HUD_ROUTES.map((spec) => ({
    path: spec.path,
    auth: "plugin" as const,
    match: "exact" as const,
    handler: createHudHandler(spec, api),
  }));
}

export function registerHudRoutes(api: OpenClawPluginApi): void {
  for (const params of buildHudRoutes(api)) {
    api.registerHttpRoute(params);
  }
}
