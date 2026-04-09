import { Type } from "@sinclair/typebox";
import type { AnyAgentTool } from "openclaw/plugin-sdk/plugin-entry";
import {
  jsonResult,
  readStringParam,
  readNumberParam,
} from "openclaw/plugin-sdk/provider-web-search";
import {
  SOCIAL_ACCOUNTS,
  isInstagramApiReady,
  getConversations,
} from "../../../legacy/connectors/instagram-api.js";

const GetDmsSchema = Type.Object(
  {
    account: Type.String(),
    limit: Type.Optional(Type.Number({ description: "Maximo de conversaciones. Default 10" })),
  },
  { additionalProperties: false },
);

export function createGetDmsTool(): AnyAgentTool {
  return {
    name: "jarvis_get_dms",
    label: "Jarvis Get DMs",
    description: "Obtiene mensajes directos (DMs) pendientes de una cuenta de Instagram.",
    parameters: GetDmsSchema,
    execute: async (_toolCallId: string, rawParams: Record<string, unknown>) => {
      const account = readStringParam(rawParams, "account") ?? "";
      const limit = readNumberParam(rawParams, "limit") ?? 10;
      try {
        if (!isInstagramApiReady()) {
          return jsonResult({ status: "failed", error: "Instagram API no configurada" });
        }
        const cfg = (SOCIAL_ACCOUNTS as Record<string, { igId?: string }>)[account];
        if (!cfg?.igId) {
          return jsonResult({ status: "failed", error: "IG Business ID no configurado" });
        }
        const data = await getConversations(cfg.igId, limit);
        return jsonResult({ status: "ok", conversations: data });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return jsonResult({ status: "failed", error: message });
      }
    },
  };
}
