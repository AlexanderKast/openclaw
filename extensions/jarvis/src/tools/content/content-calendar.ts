import { Type } from "@sinclair/typebox";
import type { AnyAgentTool } from "openclaw/plugin-sdk/plugin-entry";
import {
  jsonResult,
  readNumberParam,
  readStringArrayParam,
} from "openclaw/plugin-sdk/provider-web-search";

const ContentCalendarSchema = Type.Object(
  {
    days: Type.Number({ description: "Numero de dias del calendario" }),
    pillars: Type.Array(Type.String(), {
      description: "Pilares de contenido (educativo, entretenimiento, venta, behind-the-scenes)",
    }),
    platforms: Type.Array(Type.String(), {
      description: "Plataformas: instagram, tiktok, youtube, linkedin",
    }),
  },
  { additionalProperties: false },
);

export function createContentCalendarTool(): AnyAgentTool {
  return {
    name: "jarvis_content_calendar",
    label: "Jarvis Content Calendar",
    description:
      "Arma el prompt para generar un calendario de contenido estructurado por dias, pilares y plataformas.",
    parameters: ContentCalendarSchema,
    execute: async (_toolCallId: string, rawParams: Record<string, unknown>) => {
      try {
        const days = readNumberParam(rawParams, "days", { required: true });
        const pillars = readStringArrayParam(rawParams, "pillars", { required: true });
        const platforms = readStringArrayParam(rawParams, "platforms", { required: true });

        const prompt = `Crea un calendario de contenido para ${days} dias.
Pilares de contenido: ${pillars.join(", ")}.
Plataformas: ${platforms.join(", ")}.
Formato tabla por dia: Fecha | Pilar | Plataforma | Formato (Reel/Carrusel/Story/etc) | Idea/Tema | Hook sugerido.
Distribuye los pilares de forma balanceada. Incluye ideas especificas y accionables, no genericas.
Considera los mejores dias/horarios para cada plataforma.`;

        return jsonResult({
          status: "ok",
          prompt,
          days,
          pillars,
          platforms,
          instructions: "LLM debe generar la respuesta final usando este prompt",
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return jsonResult({ status: "failed", error: message });
      }
    },
  };
}
