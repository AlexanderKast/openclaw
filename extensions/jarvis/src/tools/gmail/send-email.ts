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

const SendEmailSchema = Type.Object(
  {
    to: Type.String({ description: "Email destino" }),
    subject: Type.String({ description: "Asunto" }),
    body: Type.String({ description: "Cuerpo del email (HTML permitido)" }),
    from_account: Type.Optional(
      Type.String({ description: "Cuenta Google (founder, ops, diana...). Default: founder" }),
    ),
  },
  { additionalProperties: false },
);

export function createSendEmailTool(): AnyAgentTool {
  return {
    name: "jarvis_send_email",
    label: "Jarvis Send Email",
    description: "Envia un email via Gmail API usando OAuth de la cuenta especificada.",
    parameters: SendEmailSchema,
    execute: async (_toolCallId: string, rawParams: Record<string, unknown>) => {
      const to = readStringParam(rawParams, "to", { required: true });
      const subject = readStringParam(rawParams, "subject", { required: true });
      const body = readStringParam(rawParams, "body", { required: true });
      const fromAccount = readStringParam(rawParams, "from_account") ?? "founder";

      try {
        const accessToken = await getGoogleAccessToken(fromAccount);

        const raw = encodeRawEmail([
          `To: ${to}`,
          "Content-Type: text/html; charset=utf-8",
          "MIME-Version: 1.0",
          `Subject: ${subject}`,
          "",
          body,
        ]);

        const { data } = await axios.post(
          "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
          { raw },
          { headers: { Authorization: `Bearer ${accessToken}` } },
        );

        return jsonResult({
          status: "ok",
          messageId: data.id,
          threadId: data.threadId,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return jsonResult({ status: "failed", error: message });
      }
    },
  };
}
