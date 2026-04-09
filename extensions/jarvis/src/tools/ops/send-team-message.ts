import { Type } from "@sinclair/typebox";
import type { AnyAgentTool } from "openclaw/plugin-sdk/plugin-entry";
import {
  jsonResult,
  readStringParam,
} from "openclaw/plugin-sdk/provider-web-search";
import { sendText } from "../../../legacy/connectors/whatsapp.js";

const SendTeamMessageSchema = Type.Object(
  {
    to_phone: Type.String({ description: "Numero internacional sin +" }),
    message: Type.String(),
  },
  { additionalProperties: false },
);

export function createSendTeamMessageTool(): AnyAgentTool {
  return {
    name: "jarvis_send_team_message",
    label: "Jarvis Send Team Message",
    description: "Envia un mensaje de WhatsApp a un miembro del equipo.",
    parameters: SendTeamMessageSchema,
    execute: async (_toolCallId: string, rawParams: Record<string, unknown>) => {
      const toPhone = readStringParam(rawParams, "to_phone") ?? "";
      const message = readStringParam(rawParams, "message") ?? "";
      try {
        await sendText(toPhone, message);
        return jsonResult({ status: "ok", to: toPhone });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return jsonResult({ status: "failed", error: msg });
      }
    },
  };
}
