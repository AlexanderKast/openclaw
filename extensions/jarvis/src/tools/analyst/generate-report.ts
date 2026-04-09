import { Type } from "@sinclair/typebox";
import type { AnyAgentTool } from "openclaw/plugin-sdk/plugin-entry";
import {
  jsonResult,
  readStringParam,
} from "openclaw/plugin-sdk/provider-web-search";

const GenerateReportSchema = Type.Object(
  {
    content_json: Type.String({ description: "Metadata del post en JSON string" }),
    strategic_analysis: Type.Optional(
      Type.String({ description: "Analisis estrategico generado" }),
    ),
    gemini_analysis: Type.Optional(Type.String({ description: "Analisis visual" })),
    drive_link: Type.Optional(Type.String({ description: "Link del media en Drive" })),
  },
  { additionalProperties: false },
);

export function createGenerateReportTool(): AnyAgentTool {
  return {
    name: "jarvis_generate_report",
    label: "Jarvis Generate Report",
    description:
      "Consolida los datos recolectados (metadata + analisis) en un payload de reporte. La generacion de PDF se agrega en fase posterior.",
    parameters: GenerateReportSchema,
    execute: async (_toolCallId: string, rawParams: Record<string, unknown>) => {
      try {
        const contentJson = readStringParam(rawParams, "content_json", { required: true });
        const strategicAnalysis = readStringParam(rawParams, "strategic_analysis") ?? "";
        const geminiAnalysis = readStringParam(rawParams, "gemini_analysis") ?? "";
        const driveLink = readStringParam(rawParams, "drive_link") ?? "";

        let contentParsed: unknown = null;
        try {
          contentParsed = JSON.parse(contentJson);
        } catch {
          contentParsed = contentJson;
        }

        return jsonResult({
          status: "ok",
          report: {
            content: contentParsed,
            strategic_analysis: strategicAnalysis,
            gemini_analysis: geminiAnalysis,
            drive_link: driveLink,
            generated_at: new Date().toISOString(),
          },
          instructions:
            "PDF generation pending (pdfkit se agregara en fase posterior). Por ahora retornamos el payload consolidado.",
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return jsonResult({ status: "failed", error: message });
      }
    },
  };
}
