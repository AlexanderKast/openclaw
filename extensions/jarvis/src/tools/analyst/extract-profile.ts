import { Type } from "@sinclair/typebox";
import type { AnyAgentTool } from "openclaw/plugin-sdk/plugin-entry";
import {
  jsonResult,
  readStringParam,
} from "openclaw/plugin-sdk/provider-web-search";
import { extractContent } from "../../../legacy/connectors/social-extractor.js";

const ExtractProfileSchema = Type.Object(
  {
    url: Type.String({ description: "URL del perfil en redes sociales" }),
  },
  { additionalProperties: false },
);

export function createExtractProfileTool(): AnyAgentTool {
  return {
    name: "jarvis_extract_profile",
    label: "Jarvis Extract Profile",
    description: "Extrae datos de un perfil de redes sociales (followers, bio, posts recientes).",
    parameters: ExtractProfileSchema,
    execute: async (_toolCallId: string, rawParams: Record<string, unknown>) => {
      try {
        const url = readStringParam(rawParams, "url", { required: true });
        const profile = await extractContent(url);
        return jsonResult({ status: "ok", url, profile });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return jsonResult({ status: "failed", error: message });
      }
    },
  };
}
