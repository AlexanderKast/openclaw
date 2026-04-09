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
  { method: "GET", path: "/plugins/jarvis/api/chat", label: "chat" },
  { method: "POST", path: "/plugins/jarvis/api/tts", label: "tts" },
  { method: "GET", path: "/plugins/jarvis/api/system", label: "system" },
  { method: "POST", path: "/plugins/jarvis/api/agents", label: "agents" },
  { method: "GET", path: "/plugins/jarvis/api/memory", label: "memory" },
  { method: "POST", path: "/plugins/jarvis/api/engine", label: "engine" },
  { method: "GET", path: "/plugins/jarvis/api/calendar", label: "calendar" },
  { method: "POST", path: "/plugins/jarvis/api/analyst", label: "analyst" },
];

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

    api.logger?.info?.(`[jarvis:hud] ${spec.method} ${spec.path} handled (stub)`);

    // TODO(phase-4): delegate to the real handler ported from
    // jarvis-assistant/src/routes/<spec.label>.ts
    writeJson(res, 501, {
      status: "not_implemented",
      route: spec.label,
      method: spec.method,
      path: spec.path,
    });
    return true;
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
