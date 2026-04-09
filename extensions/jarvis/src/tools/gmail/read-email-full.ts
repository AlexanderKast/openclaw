import { Type } from "@sinclair/typebox";
import type { AnyAgentTool } from "openclaw/plugin-sdk/plugin-entry";
import {
  jsonResult,
  readStringParam,
} from "openclaw/plugin-sdk/provider-web-search";
import { readEmailFull } from "../../../legacy/shared/google-api.js";

const ReadEmailFullSchema = Type.Object(
  {
    messageId: Type.String({ description: "ID del mensaje Gmail" }),
    account: Type.Optional(Type.String({ description: "Cuenta (default founder)" })),
  },
  { additionalProperties: false },
);

export function createReadEmailFullTool(): AnyAgentTool {
  return {
    name: "jarvis_read_email_full",
    label: "Jarvis Read Email Full",
    description: "Lee el contenido completo de un email por ID (body, threadId, labels).",
    parameters: ReadEmailFullSchema,
    execute: async (_toolCallId: string, rawParams: Record<string, unknown>) => {
      const messageId = readStringParam(rawParams, "messageId", { required: true });
      const account = readStringParam(rawParams, "account") ?? "founder";

      try {
        const email = await readEmailFull(messageId, account);
        return jsonResult({ status: "ok", email });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return jsonResult({ status: "failed", error: message });
      }
    },
  };
}
