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

const CreateDraftSchema = Type.Object(
  {
    to: Type.String({ description: "Email destino" }),
    subject: Type.String({ description: "Asunto" }),
    body: Type.String({ description: "Cuerpo (HTML permitido)" }),
    account: Type.Optional(Type.String({ description: "Cuenta (default founder)" })),
  },
  { additionalProperties: false },
);

export function createCreateDraftTool(): AnyAgentTool {
  return {
    name: "jarvis_create_draft",
    label: "Jarvis Create Draft",
    description: "Crea un borrador en Gmail sin enviarlo.",
    parameters: CreateDraftSchema,
    execute: async (_toolCallId: string, rawParams: Record<string, unknown>) => {
      const to = readStringParam(rawParams, "to", { required: true });
      const subject = readStringParam(rawParams, "subject", { required: true });
      const body = readStringParam(rawParams, "body", { required: true });
      const account = readStringParam(rawParams, "account") ?? "founder";

      try {
        const accessToken = await getGoogleAccessToken(account);

        const raw = encodeRawEmail([
          `To: ${to}`,
          `Subject: ${subject}`,
          "Content-Type: text/html; charset=utf-8",
          "MIME-Version: 1.0",
          "",
          body,
        ]);

        const { data } = await axios.post(
          "https://gmail.googleapis.com/gmail/v1/users/me/drafts",
          { message: { raw } },
          { headers: { Authorization: `Bearer ${accessToken}` } },
        );

        return jsonResult({
          status: "ok",
          draftId: data.id,
          messageId: data.message?.id,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return jsonResult({ status: "failed", error: message });
      }
    },
  };
}
