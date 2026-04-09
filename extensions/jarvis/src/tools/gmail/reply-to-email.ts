import axios from "axios";
import { Type } from "@sinclair/typebox";
import type { AnyAgentTool } from "openclaw/plugin-sdk/plugin-entry";
import {
  jsonResult,
  readStringParam,
} from "openclaw/plugin-sdk/provider-web-search";
import { getGoogleAccessToken } from "../../../legacy/shared/google-api.js";

function encodeRawEmail(lines: string[]): string {
  return Buffer.from(lines.join("\r\n"))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

const ReplyToEmailSchema = Type.Object(
  {
    messageId: Type.String({ description: "ID del email a responder" }),
    body: Type.String({ description: "Cuerpo de la respuesta (HTML permitido)" }),
    account: Type.Optional(Type.String({ description: "Cuenta (default founder)" })),
  },
  { additionalProperties: false },
);

export function createReplyToEmailTool(): AnyAgentTool {
  return {
    name: "jarvis_reply_to_email",
    label: "Jarvis Reply To Email",
    description: "Responde a un email existente preservando el thread Gmail.",
    parameters: ReplyToEmailSchema,
    execute: async (_toolCallId: string, rawParams: Record<string, unknown>) => {
      const messageId = readStringParam(rawParams, "messageId", { required: true });
      const body = readStringParam(rawParams, "body", { required: true });
      const account = readStringParam(rawParams, "account") ?? "founder";

      try {
        const accessToken = await getGoogleAccessToken(account);

        const { data: original } = await axios.get(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}`,
          {
            params: {
              format: "metadata",
              metadataHeaders: ["From", "Subject", "Message-ID", "References", "To"],
            },
            headers: { Authorization: `Bearer ${accessToken}` },
          },
        );

        const headers: { name: string; value: string }[] = original.payload?.headers ?? [];
        const get = (name: string) => headers.find((h) => h.name === name)?.value ?? "";

        const originalFrom = get("From");
        const originalSubject = get("Subject");
        const originalMessageId = get("Message-ID");
        const originalReferences = get("References");
        const threadId = original.threadId;

        const replyTo = originalFrom;
        const subject = originalSubject.startsWith("Re:")
          ? originalSubject
          : `Re: ${originalSubject}`;
        const references = originalReferences
          ? `${originalReferences} ${originalMessageId}`
          : originalMessageId;

        const raw = encodeRawEmail([
          `To: ${replyTo}`,
          `Subject: ${subject}`,
          `In-Reply-To: ${originalMessageId}`,
          `References: ${references}`,
          "Content-Type: text/html; charset=utf-8",
          "MIME-Version: 1.0",
          "",
          body,
        ]);

        const { data } = await axios.post(
          "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
          { raw, threadId },
          { headers: { Authorization: `Bearer ${accessToken}` } },
        );

        return jsonResult({
          status: "ok",
          messageId: data.id,
          threadId: data.threadId,
          replyTo,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return jsonResult({ status: "failed", error: message });
      }
    },
  };
}
