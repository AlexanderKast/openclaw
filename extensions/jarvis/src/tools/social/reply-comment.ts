import { Type } from "@sinclair/typebox";
import type { AnyAgentTool } from "openclaw/plugin-sdk/plugin-entry";
import {
  jsonResult,
  readStringParam,
} from "openclaw/plugin-sdk/provider-web-search";
import {
  isInstagramApiReady,
  replyToComment,
} from "../../../legacy/connectors/instagram-api.js";

const ReplyCommentSchema = Type.Object(
  {
    comment_id: Type.String(),
    account: Type.String(),
    reply: Type.String(),
  },
  { additionalProperties: false },
);

export function createReplyCommentTool(): AnyAgentTool {
  return {
    name: "jarvis_reply_comment",
    label: "Jarvis Reply Comment",
    description: "Responde a un comentario de Instagram con el tono de la marca.",
    parameters: ReplyCommentSchema,
    execute: async (_toolCallId: string, rawParams: Record<string, unknown>) => {
      const commentId = readStringParam(rawParams, "comment_id") ?? "";
      const account = readStringParam(rawParams, "account") ?? "";
      const reply = readStringParam(rawParams, "reply") ?? "";
      try {
        if (!isInstagramApiReady()) {
          return jsonResult({ status: "failed", error: "Instagram API no configurada" });
        }
        const replyId = await replyToComment(commentId, reply);
        return jsonResult({ status: "ok", replyId, account });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return jsonResult({ status: "failed", error: message });
      }
    },
  };
}
