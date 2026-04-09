import { Type } from "@sinclair/typebox";
import type { AnyAgentTool } from "openclaw/plugin-sdk/plugin-entry";
import {
  jsonResult,
  readStringParam,
} from "openclaw/plugin-sdk/provider-web-search";
import { isSocialMediaUrl } from "../../../legacy/connectors/social-extractor.js";

const IsSocialUrlSchema = Type.Object(
  {
    url: Type.String({ description: "URL a verificar" }),
  },
  { additionalProperties: false },
);

export function createIsSocialUrlTool(): AnyAgentTool {
  return {
    name: "jarvis_is_social_url",
    label: "Jarvis Is Social URL",
    description:
      "Verifica si una URL pertenece a una red social soportada (Instagram, TikTok, YouTube, X, LinkedIn, Facebook).",
    parameters: IsSocialUrlSchema,
    execute: async (_toolCallId: string, rawParams: Record<string, unknown>) => {
      try {
        const url = readStringParam(rawParams, "url", { required: true });
        const isSocial = isSocialMediaUrl(url);
        return jsonResult({ status: "ok", url, is_social: Boolean(isSocial) });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return jsonResult({ status: "failed", error: message });
      }
    },
  };
}
