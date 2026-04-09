import { Type } from "@sinclair/typebox";
import type { AnyAgentTool } from "openclaw/plugin-sdk/plugin-entry";
import {
  jsonResult,
  readNumberParam,
  readStringParam,
} from "openclaw/plugin-sdk/provider-web-search";
import { searchWeb } from "../../../legacy/shared/perplexity.js";

const SearchLeadsSchema = Type.Object(
  {
    business: Type.String({
      description: "Negocio: ugc_colombia, reyes_contenido, prolab, infiny_latam, kreoon",
    }),
    query: Type.Optional(
      Type.String({ description: "Query especifico (opcional, se autogenera si falta)" }),
    ),
    count: Type.Optional(Type.Number({ description: "Cantidad de leads (default 5)" })),
  },
  { additionalProperties: false },
);

const BUSINESS_QUERIES: Record<string, string> = {
  ugc_colombia: "marcas colombianas que necesitan contenido UGC Instagram 2026 agencias",
  reyes_contenido: "creadores de contenido emergentes Colombia LATAM Instagram TikTok 2026",
  prolab: "emprendedores dropshipping Colombia productos salud bienestar 2026",
  infiny_latam: "empresas colombianas que necesitan marketing digital growth 2026",
  kreoon: "empresas colombianas que necesitan desarrollo de software app plataforma 2026",
};

export function createSearchLeadsTool(): AnyAgentTool {
  return {
    name: "jarvis_search_leads",
    label: "Jarvis Search Leads",
    description:
      "Busca leads para un negocio del ecosistema via Perplexity. Devuelve resultados web crudos + prompt para extraccion por LLM.",
    parameters: SearchLeadsSchema,
    execute: async (_toolCallId: string, rawParams: Record<string, unknown>) => {
      try {
        const business = readStringParam(rawParams, "business", { required: true });
        const count = readNumberParam(rawParams, "count") ?? 5;
        let query = readStringParam(rawParams, "query") ?? "";
        if (!query) {
          query = BUSINESS_QUERIES[business] ?? `leads ${business} Colombia 2026`;
        }

        const webResults = await searchWeb(query);

        const extractionPrompt = `Eres un experto en prospeccion de leads. De los resultados web, extrae ${count} leads potenciales para ${business}.

Para cada lead genera JSON:
[{"name":"","handle":"@","platform":"instagram|linkedin|web","score":5,"notes":"","website":""}]

Solo JSON array. Si no hay leads concretos, genera leads probables basados en la industria.

Resultados web:
${String((webResults as any).result ?? "").slice(0, 3000)}`;

        return jsonResult({
          status: "ok",
          business,
          query,
          count,
          web_results: webResults,
          extraction_prompt: extractionPrompt,
          instructions:
            "LLM debe procesar extraction_prompt para extraer leads en JSON y luego llamar jarvis_store_lead por cada uno.",
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return jsonResult({ status: "failed", error: message });
      }
    },
  };
}
