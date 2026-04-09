import { Type } from "@sinclair/typebox";
import type { AnyAgentTool } from "openclaw/plugin-sdk/plugin-entry";
import {
  jsonResult,
  readStringParam,
  readNumberParam,
} from "openclaw/plugin-sdk/provider-web-search";
import { searchEmails } from "../../../legacy/shared/google-api.js";

const ReadEmailsSchema = Type.Object(
  {
    query: Type.Optional(Type.String({ description: "Filtro Gmail (ej: from:x@y.com)" })),
    maxResults: Type.Optional(Type.Number({ description: "Max resultados (default 10)" })),
    account: Type.Optional(Type.String({ description: "Cuenta (default founder)" })),
  },
  { additionalProperties: false },
);

export function createReadEmailsTool(): AnyAgentTool {
  return {
    name: "jarvis_read_emails",
    label: "Jarvis Read Emails",
    description: "Lee correos recientes de Gmail (metadata + snippet).",
    parameters: ReadEmailsSchema,
    execute: async (_toolCallId: string, rawParams: Record<string, unknown>) => {
      const query = readStringParam(rawParams, "query") ?? "";
      const maxResults = readNumberParam(rawParams, "maxResults") ?? 10;
      const account = readStringParam(rawParams, "account") ?? "founder";

      try {
        const details = await searchEmails(query, maxResults, account);
        return jsonResult({ status: "ok", count: details.length, emails: details });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return jsonResult({ status: "failed", error: message });
      }
    },
  };
}
