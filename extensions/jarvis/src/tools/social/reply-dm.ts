import { Type } from "@sinclair/typebox";
import type { AnyAgentTool } from "openclaw/plugin-sdk/plugin-entry";
import {
  jsonResult,
  readStringParam,
} from "openclaw/plugin-sdk/provider-web-search";
import {
  SOCIAL_ACCOUNTS,
  isInstagramApiReady,
  sendIgMessage,
} from "../../../legacy/connectors/instagram-api.js";

const ReplyDmSchema = Type.Object(
  {
    account: Type.String(),
    conversation_id: Type.Optional(Type.String()),
    recipient_id: Type.String(),
    message: Type.String(),
  },
  { additionalProperties: false },
);

export function createReplyDmTool(): AnyAgentTool {
  return {
    name: "jarvis_reply_dm",
    label: "Jarvis Reply DM",
    description: "Responde a un DM de Instagram.",
    parameters: ReplyDmSchema,
    execute: async (_toolCallId: string, rawParams: Record<string, unknown>) => {
      const account = readStringParam(rawParams, "account") ?? "";
      const recipientId = readStringParam(rawParams, "recipient_id") ?? "";
      const message = readStringParam(rawParams, "message") ?? "";
      try {
        if (!isInstagramApiReady()) {
          return jsonResult({ status: "failed", error: "Instagram API no configurada" });
        }
        const cfg = (SOCIAL_ACCOUNTS as Record<string, { pageId?: string }>)[account];
        if (!cfg?.pageId) {
          return jsonResult({ status: "failed", error: "Page ID no configurado para esta cuenta" });
        }
        await sendIgMessage(recipientId, message, cfg.pageId);
        return jsonResult({ status: "ok", account, recipientId });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return jsonResult({ status: "failed", error: msg });
      }
    },
  };
}
