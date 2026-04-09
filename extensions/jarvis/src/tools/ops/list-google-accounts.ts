import { Type } from "@sinclair/typebox";
import type { AnyAgentTool } from "openclaw/plugin-sdk/plugin-entry";
import { jsonResult } from "openclaw/plugin-sdk/provider-web-search";
import { listAccounts } from "../../../legacy/shared/google-api.js";

const ListGoogleAccountsSchema = Type.Object({}, { additionalProperties: false });

export function createListGoogleAccountsTool(): AnyAgentTool {
  return {
    name: "jarvis_list_google_accounts",
    label: "Jarvis List Google Accounts",
    description: "Lista todas las cuentas Google conectadas a Jarvis con su email y nombre.",
    parameters: ListGoogleAccountsSchema,
    execute: async (_toolCallId: string, _rawParams: Record<string, unknown>) => {
      try {
        const accounts = listAccounts();
        return jsonResult({
          status: "ok",
          count: Object.keys(accounts).length,
          accounts,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return jsonResult({ status: "failed", error: message });
      }
    },
  };
}
