import { Type } from "@sinclair/typebox";
import type { AnyAgentTool } from "openclaw/plugin-sdk/plugin-entry";
import {
  jsonResult,
  readStringParam,
} from "openclaw/plugin-sdk/provider-web-search";

const AnalyzeStrategySchema = Type.Object(
  {
    content_json: Type.String({ description: "Metadata del post en JSON string" }),
    gemini_analysis: Type.Optional(
      Type.String({ description: "Analisis visual previo (opcional)" }),
    ),
    drive_link: Type.Optional(Type.String({ description: "Link a Drive del media" })),
  },
  { additionalProperties: false },
);

const STRATEGIC_SYSTEM_PROMPT = `Eres un analista de contenido de nivel mundial para Kreoon, agencia UGC en Colombia.

Recibes DOS fuentes:
1. ANALISIS VISUAL (si disponible): Desglose del video/imagen
2. METADATA: Caption, hashtags, metricas, perfil del creador

Genera un analisis de 12 DIMENSIONES con secciones: ESTRUCTURA (Hook, Desarrollo, CTA, Formato), PRODUCCION (Camaras, Edicion, Audio, Texto), COPY (Formula, Palabras de poder, Gatillos, Tono), ESTRATEGIA (Embudo, Pilar, Angulo, Viralidad), VEREDICTO (funciona, mejorar, oportunidad).

REGLAS: Brutalmente honesto. Cuantifica todo. Espanol colombiano, directo.`;

export function createAnalyzeStrategyTool(): AnyAgentTool {
  return {
    name: "jarvis_analyze_strategy",
    label: "Jarvis Analyze Strategy",
    description:
      "Prepara el prompt para el analisis estrategico de 12 dimensiones de un post. El analisis real lo hace el runtime del agente raiz.",
    parameters: AnalyzeStrategySchema,
    execute: async (_toolCallId: string, rawParams: Record<string, unknown>) => {
      try {
        const contentJson = readStringParam(rawParams, "content_json", { required: true });
        const geminiAnalysis = readStringParam(rawParams, "gemini_analysis") ?? "";
        const driveLink = readStringParam(rawParams, "drive_link") ?? "";

        const userPrompt = `## ANALISIS VISUAL:
${geminiAnalysis || "(No disponible)"}

## METADATA:
${contentJson}

## DRIVE: ${driveLink}

Genera el analisis estrategico de 12 dimensiones.`;

        return jsonResult({
          status: "delegated_to_runtime",
          system_prompt: STRATEGIC_SYSTEM_PROMPT,
          user_prompt: userPrompt,
          instructions:
            "El LLM/runtime del agente raiz debe generar el analisis estrategico usando estos prompts (mediaUnderstanding en fase 3).",
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return jsonResult({ status: "failed", error: message });
      }
    },
  };
}
