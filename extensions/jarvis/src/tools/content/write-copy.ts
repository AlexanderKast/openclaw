import { Type } from "@sinclair/typebox";
import type { AnyAgentTool } from "openclaw/plugin-sdk/plugin-entry";
import {
  jsonResult,
  readStringArrayParam,
  readStringParam,
} from "openclaw/plugin-sdk/provider-web-search";

const WriteCopySchema = Type.Object(
  {
    formula: Type.String({ description: "Formula: AIDA, PAS, BAB, 4U, ACCA" }),
    product: Type.String({ description: "Producto o servicio" }),
    audience: Type.String({ description: "Audiencia objetivo" }),
    pain_points: Type.Optional(
      Type.Array(Type.String(), { description: "Puntos de dolor de la audiencia" }),
    ),
  },
  { additionalProperties: false },
);

function getFormulaGuide(formula: string): string {
  const guides: Record<string, string> = {
    AIDA: "- Atencion: hook que detiene el scroll\n- Interes: datos o historia que engancha\n- Deseo: beneficios transformadores\n- Accion: CTA claro y urgente",
    PAS: "- Problema: nombra el dolor exacto\n- Agitacion: amplifica las consecuencias\n- Solucion: el producto como salida ideal",
    BAB: "- Before: situacion actual dolorosa\n- After: vida ideal tras la solucion\n- Bridge: el producto como puente",
    "4U": "- Urgente: urgencia real\n- Unico: diferenciador claro\n- Util: valor medible\n- Ultra-especifico: datos, numeros",
    ACCA: "- Awareness: problema oculto\n- Comprension: impacto\n- Conviccion: prueba social\n- Accion: CTA directo",
  };
  return guides[formula.toUpperCase()] ?? `Aplica correctamente los pasos de la formula ${formula}.`;
}

export function createWriteCopyTool(): AnyAgentTool {
  return {
    name: "jarvis_write_copy",
    label: "Jarvis Write Copy",
    description:
      "Arma el prompt para escribir copy persuasivo usando formulas probadas (AIDA, PAS, BAB, 4U, ACCA).",
    parameters: WriteCopySchema,
    execute: async (_toolCallId: string, rawParams: Record<string, unknown>) => {
      try {
        const formula = readStringParam(rawParams, "formula", { required: true });
        const product = readStringParam(rawParams, "product", { required: true });
        const audience = readStringParam(rawParams, "audience", { required: true });
        const painPoints = readStringArrayParam(rawParams, "pain_points") ?? [];
        const painSection = painPoints.length ? `\nPuntos de dolor: ${painPoints.join(", ")}` : "";

        const prompt = `Escribe copy persuasivo usando la formula ${formula} para:
Producto/Servicio: "${product}"
Audiencia objetivo: "${audience}"${painSection}

Aplica la formula ${formula} correctamente:
${getFormulaGuide(formula)}

El copy debe ser en espanol colombiano/LATAM natural. Longitud apropiada para redes sociales o landing page.`;

        return jsonResult({
          status: "ok",
          prompt,
          formula,
          product,
          audience,
          pain_points: painPoints,
          instructions: "LLM debe generar la respuesta final usando este prompt",
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return jsonResult({ status: "failed", error: message });
      }
    },
  };
}
