/**
 * WhatsApp Cloud API webhook handler for Jarvis.
 *
 * Ported from jarvis-assistant/src/server.ts lines 110-233.
 *
 * Exposes:
 *   - GET  /plugins/jarvis/api/whatsapp-webhook  (Meta webhook verify)
 *   - POST /plugins/jarvis/api/whatsapp-webhook  (inbound messages)
 *
 * Caddy must rewrite jarvis.kreoon.com/webhook to this path during cutover.
 * The handler validates the HMAC signature with WHATSAPP_APP_SECRET, parses
 * the Meta payload, and delegates to the jarvis-core sub-agent via
 * api.runtime.subagent.run.
 */

import type { IncomingMessage, ServerResponse } from "node:http";
import type { OpenClawPluginApi } from "openclaw/plugin-sdk/plugin-entry";
import crypto from "node:crypto";
import path from "node:path";
import { config, team } from "../../legacy/shared/config.js";
import {
  sendText,
  sendReaction,
  markAsRead,
} from "../../legacy/connectors/whatsapp.js";

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

// Dedup set to avoid processing the same Meta message twice (Meta retries).
const processing = new Set<string>();

function writeText(res: ServerResponse, status: number, body: string): void {
  res.statusCode = status;
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.end(body);
}

function writeJson(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

async function readRawBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function parseQuery(url: string): Record<string, string> {
  const queryStart = url.indexOf("?");
  if (queryStart === -1) return {};
  const query = url.slice(queryStart + 1);
  const result: Record<string, string> = {};
  for (const pair of query.split("&")) {
    const [k, v] = pair.split("=");
    if (k) result[decodeURIComponent(k)] = v ? decodeURIComponent(v) : "";
  }
  return result;
}

/**
 * Handles Meta webhook verification (GET with hub.mode=subscribe).
 * Meta calls this once when the webhook URL is first configured.
 */
function createVerifyHandler(api: OpenClawPluginApi): OpenClawPluginHttpRouteHandler {
  return async (req, res) => {
    if (req.method !== "GET") {
      writeJson(res, 405, { error: "method_not_allowed" });
      return true;
    }

    const query = parseQuery(req.url ?? "");
    const mode = query["hub.mode"];
    const token = query["hub.verify_token"];
    const challenge = query["hub.challenge"];

    const expected =
      process.env.WHATSAPP_VERIFY_TOKEN || config.webhookVerifyToken;

    if (mode === "subscribe" && token === expected) {
      api.logger?.info?.("[jarvis:webhook] Meta verify OK");
      writeText(res, 200, challenge ?? "");
    } else {
      api.logger?.warn?.(
        `[jarvis:webhook] Meta verify rejected: mode=${mode} token=${token ? "<set>" : "<missing>"}`,
      );
      writeText(res, 403, "Forbidden");
    }
    return true;
  };
}

/**
 * Handles inbound WhatsApp messages (POST from Meta).
 * - Validates HMAC signature
 * - Parses the first message in the payload
 * - Reacts with 🤔, marks as read
 * - Delegates to jarvis-core sub-agent via api.runtime.subagent.run
 * - Sends the final text back to the user via WhatsApp
 */
function createInboundHandler(api: OpenClawPluginApi): OpenClawPluginHttpRouteHandler {
  return async (req, res) => {
    if (req.method !== "POST") {
      writeJson(res, 405, { error: "method_not_allowed" });
      return true;
    }

    let rawBody: Buffer;
    try {
      rawBody = await readRawBody(req);
    } catch (err) {
      api.logger?.error?.(
        `[jarvis:webhook] failed to read body: ${err instanceof Error ? err.message : String(err)}`,
      );
      writeJson(res, 400, { error: "bad_request" });
      return true;
    }

    // HMAC validation
    const signature = req.headers["x-hub-signature-256"] as string | undefined;
    const appSecret = process.env.WHATSAPP_APP_SECRET || config.wa.appSecret;
    if (signature && appSecret) {
      const expected =
        "sha256=" +
        crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");
      if (signature !== expected) {
        api.logger?.warn?.("[jarvis:webhook] invalid HMAC signature");
        writeJson(res, 401, { error: "invalid_signature" });
        return true;
      }
    }

    // Respond immediately — Meta requires a 200 within ~15s or it retries
    writeJson(res, 200, { status: "ok" });

    // Parse and process asynchronously
    processMessageAsync(api, rawBody).catch((err) => {
      api.logger?.error?.(
        `[jarvis:webhook] processing error: ${err instanceof Error ? err.message : String(err)}`,
      );
    });

    return true;
  };
}

/**
 * Parses the WA payload and delegates to the jarvis-core sub-agent.
 * Runs async after the 200 response so Meta doesn't retry.
 */
async function processMessageAsync(
  api: OpenClawPluginApi,
  rawBody: Buffer,
): Promise<void> {
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody.toString("utf-8"));
  } catch {
    api.logger?.warn?.("[jarvis:webhook] invalid JSON body");
    return;
  }

  const entry = (payload.entry as Array<Record<string, unknown>>)?.[0];
  const changes = (entry?.changes as Array<Record<string, unknown>>)?.[0];
  const value = changes?.value as Record<string, unknown> | undefined;
  const messages = value?.messages as Array<Record<string, unknown>> | undefined;

  if (!messages?.[0]) {
    // Status update or other non-message event — ignore.
    return;
  }

  const msg = messages[0];
  const contacts = value?.contacts as
    | Array<{ profile?: { name?: string } }>
    | undefined;
  const contact = contacts?.[0];
  const messageId = msg.id as string;

  // Dedup
  if (processing.has(messageId)) return;
  processing.add(messageId);
  setTimeout(() => processing.delete(messageId), 60_000);

  const from = msg.from as string;
  const msgType = msg.type as string;
  const text =
    (msg.text as { body?: string } | undefined)?.body ??
    (msg.caption as string | undefined) ??
    "";

  // Team lookup (ACL)
  const member = team[from];
  if (!member) {
    api.logger?.warn?.(`[jarvis:webhook] unknown number, ignoring: ${from}`);
    return;
  }

  api.logger?.info?.(
    `[jarvis:webhook] inbound from ${member.name} (${from}): ${text.slice(0, 100)}`,
  );

  // Mark as read + thinking reaction
  try {
    await markAsRead(messageId);
    await sendReaction(from, messageId, "🤔");
  } catch (err) {
    api.logger?.warn?.(
      `[jarvis:webhook] read/reaction failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  // Build the message the sub-agent will see
  let subagentMessage = text;
  if (msgType === "audio") {
    // TODO(phase-6c): transcribe via api.runtime.mediaUnderstanding.transcribeAudioFile
    subagentMessage = "[Audio recibido — transcripcion pendiente]";
  } else if (msgType === "image") {
    subagentMessage = `[Imagen recibida] ${text}`;
  }

  // Inject member context into the message
  const contextPrefix = `[De: ${member.name} (${member.role})]\n`;
  const fullMessage = contextPrefix + subagentMessage;

  // Delegate to the embedded Pi agent (in-process, no gateway scope required)
  // This is the idiomatic pattern used by voice-call and memory-core bundled plugins.
  let responseText = "";
  try {
    const runtimeAgent = (api.runtime as unknown as {
      agent: {
        resolveAgentDir: (cfg: unknown) => string;
        resolveAgentWorkspaceDir: (cfg: unknown) => string;
        resolveAgentTimeoutMs: (arg: unknown) => number;
        runEmbeddedPiAgent: (params: Record<string, unknown>) => Promise<{
          payloads?: Array<{ text?: string; isError?: boolean; isReasoning?: boolean }>;
          meta?: { aborted?: boolean };
        }>;
      };
    }).agent;

    const cfg = api.config;
    const agentDir = runtimeAgent.resolveAgentDir(cfg);
    const workspaceDir = runtimeAgent.resolveAgentWorkspaceDir(cfg);
    const timeoutMs = runtimeAgent.resolveAgentTimeoutMs({ cfg });

    const sessionKey = `jarvis:whatsapp:${from}`;
    const sessionId = `wa:${from}:${Date.now()}`;
    const sessionFileName = `jarvis-whatsapp-${from}.jsonl`;
    const sessionFile = path.join(agentDir, "sessions", sessionFileName);
    const runId = `jarvis-wa:${messageId}`;

    api.logger?.info?.(
      `[jarvis:webhook] running embedded agent session=${sessionKey} file=${sessionFile}`,
    );

    // Force Gemini provider since Claude credits are exhausted in prod.
    // TODO(phase-6c): read from config.agents.defaults.model once that
    // resolution is proven stable.
    const provider = process.env.JARVIS_LLM_PROVIDER || "google";
    const model = process.env.JARVIS_LLM_MODEL || "gemini-2.5-flash";

    const result = await runtimeAgent.runEmbeddedPiAgent({
      sessionId,
      sessionKey,
      sessionFile,
      workspaceDir,
      agentDir,
      config: cfg,
      prompt: fullMessage,
      provider,
      model,
      runId,
      timeoutMs,
      lane: "whatsapp",
      messageProvider: "whatsapp",
      verboseLevel: "off",
    });

    // Extract final text from payloads (same pattern as voice-call)
    const payloads = (result.payloads ?? []).filter(
      (p) => !p.isError && !p.isReasoning && typeof p.text === "string",
    );
    responseText = payloads
      .map((p) => p.text!)
      .join("\n")
      .trim();

    // Gemini/Claude sometimes wrap final answers in <final>...</final> tags.
    // Strip them so the WhatsApp user sees clean text.
    const finalMatch = responseText.match(/<final>([\s\S]*?)<\/final>/);
    if (finalMatch) {
      responseText = finalMatch[1].trim();
    }

    if (!responseText) {
      responseText = result.meta?.aborted
        ? "Uy parce, se me corto la ejecucion."
        : "Listo parce.";
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    api.logger?.error?.(`[jarvis:webhook] embedded agent failed: ${message}`);
    responseText = `Se me complico con eso: ${message.slice(0, 150)}`;
  }

  // Send response back to user
  try {
    await sendText(from, responseText);
    await sendReaction(from, messageId, "");
  } catch (err) {
    api.logger?.error?.(
      `[jarvis:webhook] sendText failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  api.logger?.info?.(
    `[jarvis:webhook] processed from=${member.name} replyLen=${responseText.length}`,
  );
}

/**
 * Factory that builds the 2 route params (GET verify + POST inbound)
 * the plugin needs to register in its `register(api)` callback.
 */
export function buildWhatsAppWebhookRoutes(
  api: OpenClawPluginApi,
): OpenClawPluginHttpRouteParams[] {
  return [
    {
      path: "/plugins/jarvis/api/whatsapp-webhook",
      handler: createVerifyHandler(api),
      auth: "plugin",
      match: "exact",
    },
    {
      path: "/plugins/jarvis/api/whatsapp-webhook",
      handler: createInboundHandler(api),
      auth: "plugin",
      match: "exact",
    },
  ];
}

export function registerWhatsAppWebhook(api: OpenClawPluginApi): void {
  // We register a single handler that dispatches by method internally.
  const verify = createVerifyHandler(api);
  const inbound = createInboundHandler(api);
  const dispatch: OpenClawPluginHttpRouteHandler = async (req, res) => {
    if (req.method === "GET") return verify(req, res);
    if (req.method === "POST") return inbound(req, res);
    writeJson(res, 405, { error: "method_not_allowed" });
    return true;
  };

  (api as unknown as {
    registerHttpRoute: (p: OpenClawPluginHttpRouteParams) => void;
  }).registerHttpRoute({
    path: "/plugins/jarvis/api/whatsapp-webhook",
    handler: dispatch,
    auth: "plugin",
    match: "exact",
  });
}
