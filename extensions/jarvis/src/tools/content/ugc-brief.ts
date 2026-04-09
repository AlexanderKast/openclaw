import { Type } from "@sinclair/typebox";
import type { AnyAgentTool } from "openclaw/plugin-sdk/plugin-entry";
import {
  jsonResult,
  readStringParam,
} from "openclaw/plugin-sdk/provider-web-search";

const UgcBriefSchema = Type.Object(
  {
    brand: Type.String({ description: "Nombre de la marca o cliente" }),
    product: Type.String({ description: "Producto o servicio a promocionar" }),
    objective: Type.String({ description: "Objetivo: awareness, conversion, retencion, educacion" }),
    platform: Type.String({ description: "Plataforma: tiktok, instagram, youtube" }),
    duration: Type.Optional(Type.String({ description: "Duracion del video (ej: 15s, 30s, 60s)" })),
  },
  { additionalProperties: false },
);

export function createUgcBriefTool(): AnyAgentTool {
  return {
    name: "jarvis_ugc_brief",
    label: "Jarvis UGC Brief",
    description:
      "Arma el prompt para generar un brief profesional UGC con instrucciones de grabacion, mensajes clave y entregables.",
    parameters: UgcBriefSchema,
    execute: async (_toolCallId: string, rawParams: Record<string, unknown>) => {
      try {
        const brand = readStringParam(rawParams, "brand", { required: true });
        const product = readStringParam(rawParams, "product", { required: true });
        const objective = readStringParam(rawParams, "objective", { required: true });
        const platform = readStringParam(rawParams, "platform", { required: true });
        const duration = readStringParam(rawParams, "duration") ?? "30s";

        const prompt = `Genera un brief profesional de UGC para:
Marca: "${brand}"
Producto: "${product}"
Objetivo: "${objective}"
Plataforma: ${platform}
Duracion: ${duration}

El brief debe incluir:
1. Resumen del proyecto y contexto de marca
2. Objetivo del video y KPI principal
3. Audiencia objetivo
4. Mensajes clave (3 maximo)
5. Estructura del video (hook, desarrollo, CTA) con tiempos
6. Do's y Don'ts de grabacion
7. Referencias visuales o estilo deseado
8. Entregables: formato, resolucion, archivos requeridos
9. Deadline y proceso de revision

Redactar en espanol, tono profesional pero accesible para creators independientes.`;

        return jsonResult({
          status: "ok",
          prompt,
          brand,
          product,
          objective,
          platform,
          duration,
          instructions: "LLM debe generar la respuesta final usando este prompt",
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return jsonResult({ status: "failed", error: message });
      }
    },
  };
}
