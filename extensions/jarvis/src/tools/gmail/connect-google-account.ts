import { Type } from "@sinclair/typebox";
import type { AnyAgentTool } from "openclaw/plugin-sdk/plugin-entry";
import {
  jsonResult,
  readStringParam,
} from "openclaw/plugin-sdk/provider-web-search";

const ConnectGoogleAccountSchema = Type.Object(
  {
    name: Type.String({ description: "Nombre amigable de la cuenta (ej: founder, ops, diana)" }),
  },
  { additionalProperties: false },
);

export function createConnectGoogleAccountTool(): AnyAgentTool {
  return {
    name: "jarvis_connect_google_account",
    label: "Jarvis Connect Google Account",
    description: "Genera link OAuth para conectar una nueva cuenta Google (Gmail/Calendar).",
    parameters: ConnectGoogleAccountSchema,
    execute: async (_toolCallId: string, rawParams: Record<string, unknown>) => {
      const name = readStringParam(rawParams, "name", { required: true });

      try {
        const key = name.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
        const link = `https://jarvis.kreoon.com/auth/google/start?account=${encodeURIComponent(key)}`;
        return jsonResult({
          status: "ok",
          accountKey: key,
          authLink: link,
          instructions: `Envia este link a la persona para que autorice su cuenta Google. Una vez autoricen, podras usar account: "${key}" en calendario y email.`,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return jsonResult({ status: "failed", error: message });
      }
    },
  };
}
