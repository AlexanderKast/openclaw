import { Type } from "@sinclair/typebox";
import type { AnyAgentTool } from "openclaw/plugin-sdk/plugin-entry";
import {
  jsonResult,
  readStringParam,
} from "openclaw/plugin-sdk/provider-web-search";
import { searchWeb } from "../../../legacy/shared/perplexity.js";

const WebSearchSchema = Type.Object(
  {
    query: Type.String({ description: "Consulta de busqueda web en lenguaje natural" }),
  },
  { additionalProperties: false },
);

export function createWebSearchTool(): AnyAgentTool {
  return {
    name: "jarvis_web_search",
    label: "Jarvis Web Search",
    description:
      "Busca informacion actualizada en la web via Perplexity. Usalo para tendencias, noticias, referencias de contenido o datos de mercado.",
    parameters: WebSearchSchema,
    execute: async (_toolCallId: string, rawParams: Record<string, unknown>) => {
      const query = readStringParam(rawParams, "query", { required: true });
      try {
        const result = await searchWeb(query);
        return jsonResult({ status: "ok", query, ...result });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return jsonResult({ status: "failed", error: message });
      }
    },
  };
}
