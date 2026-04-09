import { Type } from "@sinclair/typebox";
import type { AnyAgentTool } from "openclaw/plugin-sdk/plugin-entry";
import {
  jsonResult,
  readStringParam,
} from "openclaw/plugin-sdk/provider-web-search";
import { extractContent } from "../../../legacy/connectors/social-extractor.js";

const ExtractContentSchema = Type.Object(
  {
    url: Type.String({
      description: "URL publica de Instagram, TikTok, YouTube, Twitter/X, LinkedIn o Facebook",
    }),
  },
  { additionalProperties: false },
);

export function createExtractContentTool(): AnyAgentTool {
  return {
    name: "jarvis_extract_content",
    label: "Jarvis Extract Content",
    description:
      "Descarga y extrae metadata de un post de redes sociales (Instagram, TikTok, YouTube, X, LinkedIn, Facebook).",
    parameters: ExtractContentSchema,
    execute: async (_toolCallId: string, rawParams: Record<string, unknown>) => {
      try {
        const url = readStringParam(rawParams, "url", { required: true });
        const content = await extractContent(url);
        return jsonResult({ status: "ok", url, content });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return jsonResult({ status: "failed", error: message });
      }
    },
  };
}
