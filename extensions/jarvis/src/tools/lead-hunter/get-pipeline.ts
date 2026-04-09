import { promises as fs } from "fs";
import { Type } from "@sinclair/typebox";
import type { AnyAgentTool } from "openclaw/plugin-sdk/plugin-entry";
import {
  jsonResult,
  readStringParam,
} from "openclaw/plugin-sdk/provider-web-search";

const LEADS_FILE = "/app/data/leads.json";

const GetPipelineSchema = Type.Object(
  {
    business: Type.Optional(Type.String({ description: "Negocio o 'all'" })),
    status: Type.Optional(
      Type.String({ description: "new, contacted, qualified, converted, lost" }),
    ),
  },
  { additionalProperties: false },
);

interface Lead {
  id: string;
  business: string;
  status: string;
  [k: string]: unknown;
}

async function loadLeads(): Promise<Lead[]> {
  try {
    const raw = await fs.readFile(LEADS_FILE, "utf8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function createGetPipelineTool(): AnyAgentTool {
  return {
    name: "jarvis_get_pipeline",
    label: "Jarvis Get Pipeline",
    description: "Obtiene el pipeline de leads filtrado por negocio y/o status.",
    parameters: GetPipelineSchema,
    execute: async (_toolCallId: string, rawParams: Record<string, unknown>) => {
      try {
        const business = readStringParam(rawParams, "business") ?? "all";
        const status = readStringParam(rawParams, "status") ?? "";

        const leads = await loadLeads();
        let filtered = leads;
        if (business !== "all") filtered = filtered.filter((l) => l.business === business);
        if (status) filtered = filtered.filter((l) => l.status === status);

        const summary: Record<string, number> = {};
        for (const l of filtered) {
          summary[l.status] = (summary[l.status] || 0) + 1;
        }

        return jsonResult({
          status: "ok",
          total: filtered.length,
          byStatus: summary,
          leads: filtered.slice(-20),
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return jsonResult({ status: "failed", error: message });
      }
    },
  };
}
