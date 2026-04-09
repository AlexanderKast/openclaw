import { promises as fs } from "fs";
import path from "path";
import { Type } from "@sinclair/typebox";
import type { AnyAgentTool } from "openclaw/plugin-sdk/plugin-entry";
import {
  jsonResult,
  readStringParam,
} from "openclaw/plugin-sdk/provider-web-search";

const LEADS_FILE = "/app/data/leads.json";

const UpdateLeadStatusSchema = Type.Object(
  {
    lead_id: Type.String({ description: "ID del lead" }),
    status: Type.String({ description: "new, contacted, qualified, converted, lost" }),
    notes: Type.Optional(Type.String()),
  },
  { additionalProperties: false },
);

interface Lead {
  id: string;
  status: string;
  notes: string;
  lastContact?: string;
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

async function saveLeads(leads: Lead[]): Promise<void> {
  await fs.mkdir(path.dirname(LEADS_FILE), { recursive: true });
  await fs.writeFile(LEADS_FILE, JSON.stringify(leads, null, 2), "utf8");
}

export function createUpdateLeadStatusTool(): AnyAgentTool {
  return {
    name: "jarvis_update_lead_status",
    label: "Jarvis Update Lead Status",
    description: "Actualiza el estado de un lead en el pipeline.",
    parameters: UpdateLeadStatusSchema,
    execute: async (_toolCallId: string, rawParams: Record<string, unknown>) => {
      try {
        const leadId = readStringParam(rawParams, "lead_id", { required: true });
        const status = readStringParam(rawParams, "status", { required: true });
        const notes = readStringParam(rawParams, "notes") ?? "";

        const leads = await loadLeads();
        const lead = leads.find((l) => l.id === leadId);
        if (!lead) {
          return jsonResult({ status: "failed", error: "Lead no encontrado" });
        }

        lead.status = status;
        if (notes) lead.notes += `\n[${new Date().toISOString()}] ${notes}`;
        lead.lastContact = new Date().toISOString();
        await saveLeads(leads);

        return jsonResult({ status: "ok", lead });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return jsonResult({ status: "failed", error: message });
      }
    },
  };
}
