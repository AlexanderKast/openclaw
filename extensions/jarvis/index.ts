import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import type { AnyAgentTool } from "openclaw/plugin-sdk/plugin-entry";
import { Type } from "@sinclair/typebox";
import { jsonResult, readStringParam } from "openclaw/plugin-sdk/provider-web-search";
import { createWhatsAppSendTextTool } from "./src/tools/whatsapp/send-text.js";

/**
 * Jarvis plugin para OpenClaw.
 *
 * POC: registra una sola tool stub `jarvis_route_to_agent` para validar
 * que el SDK tipa correctamente y que el plugin es descubierto.
 *
 * Proximos pasos (Fase 2): registrar las ~30 tools propietarias
 * envolviendo los connectors legacy de jarvis-assistant/src/connectors/.
 */

const RouteToAgentSchema = Type.Object(
  {
    agent: Type.String({
      description:
        "Sub-agente destino: ops | content | memory | social | lead-hunter | analyst | engine | brand-researcher",
    }),
    intent: Type.String({
      description: "Intent extraido del mensaje original del usuario.",
    }),
  },
  { additionalProperties: false },
);

const ALLOWED_AGENTS = new Set([
  "ops",
  "content",
  "memory",
  "social",
  "lead-hunter",
  "analyst",
  "engine",
  "brand-researcher",
]);

function createRouteToAgentTool(): AnyAgentTool {
  return {
    name: "jarvis_route_to_agent",
    label: "Jarvis Route To Agent",
    description:
      "Delega la consulta del usuario al sub-agente de Jarvis adecuado " +
      "(ops, content, memory, social, lead-hunter, analyst, engine, brand-researcher).",
    parameters: RouteToAgentSchema,
    execute: async (_toolCallId: string, rawParams: Record<string, unknown>) => {
      const agent = readStringParam(rawParams, "agent", { required: true });
      const intent = readStringParam(rawParams, "intent", { required: true });

      if (!ALLOWED_AGENTS.has(agent)) {
        return jsonResult({
          status: "failed",
          error: `Agente desconocido: ${agent}`,
        });
      }

      // POC: por ahora solo confirma la decision de routing.
      // En Fase 3 esto invocara al sub-agente real via api.runtime.subagent.run.
      return jsonResult({
        status: "ok",
        route: agent,
        intent,
        marker: `[ROUTE:${agent}]`,
      });
    },
  };
}

export default definePluginEntry({
  id: "jarvis",
  name: "Jarvis",
  description:
    "Asistente personal del ecosistema Kreoon (parcero). Sub-agentes y connectors propietarios.",
  register(api) {
    api.registerTool(createRouteToAgentTool());
    api.registerTool(createWhatsAppSendTextTool());
  },
});
