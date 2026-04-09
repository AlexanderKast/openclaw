import { Type } from "@sinclair/typebox";
import type { AnyAgentTool } from "openclaw/plugin-sdk/plugin-entry";
import {
  jsonResult,
  readStringParam,
} from "openclaw/plugin-sdk/provider-web-search";
import {
  SOCIAL_ACCOUNTS,
  isInstagramApiReady,
} from "../../../legacy/connectors/instagram-api.js";

const GetAccountStatsSchema = Type.Object(
  {
    account: Type.String({ description: 'Cuenta o "all" para todas' }),
  },
  { additionalProperties: false },
);

export function createGetAccountStatsTool(): AnyAgentTool {
  return {
    name: "jarvis_get_account_stats",
    label: "Jarvis Get Account Stats",
    description: "Obtiene metricas y estadisticas de una cuenta de Instagram.",
    parameters: GetAccountStatsSchema,
    execute: async (_toolCallId: string, rawParams: Record<string, unknown>) => {
      const account = readStringParam(rawParams, "account") ?? "all";
      try {
        if (!isInstagramApiReady()) {
          return jsonResult({
            status: "ok",
            note: "Instagram API no configurada. Datos basados en ultimo scraping.",
            accounts: Object.entries(SOCIAL_ACCOUNTS).map(([key, acc]) => ({
              name: key,
              instagram: `@${(acc as { instagram?: string }).instagram}`,
              apiReady: !!(acc as { igId?: string }).igId,
            })),
          });
        }
        return jsonResult({
          status: "ok",
          account,
          note: "Stats disponibles cuando se configure META_GRAPH_TOKEN completo.",
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return jsonResult({ status: "failed", error: message });
      }
    },
  };
}
