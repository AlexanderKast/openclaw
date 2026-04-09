import { promises as fs } from "fs";
import path from "path";
import { Type } from "@sinclair/typebox";
import type { AnyAgentTool } from "openclaw/plugin-sdk/plugin-entry";
import {
  jsonResult,
  readNumberParam,
  readStringParam,
} from "openclaw/plugin-sdk/provider-web-search";

const LEADS_FILE = "/app/data/leads.json";

const StoreLeadSchema = Type.Object(
  {
    business: Type.String(),
    name: Type.String(),
    handle: Type.String(),
    platform: Type.String(),
    score: Type.Number(),
    notes: Type.String(),
    email: Type.Optional(Type.String()),
    website: Type.Optional(Type.String()),
    outreach_draft: Type.Optional(Type.String()),
  },
  { additionalProperties: false },
);

interface Lead {
  id: string;
  business: string;
  name: string;
  handle: string;
  platform: string;
  email?: string;
  website?: string;
  score: number;
  status: string;
  notes: string;
  outreachDraft?: string;
  createdAt: string;
  lastContact?: string;
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

function generateId(): string {
  return `lead_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createStoreLeadTool(): AnyAgentTool {
  return {
    name: "jarvis_store_lead",
    label: "Jarvis Store Lead",
    description: "Guarda un lead en /app/data/leads.json.",
    parameters: StoreLeadSchema,
    execute: async (_toolCallId: string, rawParams: Record<string, unknown>) => {
      try {
        const lead: Lead = {
          id: generateId(),
          business: readStringParam(rawParams, "business", { required: true }),
          name: readStringParam(rawParams, "name", { required: true }),
          handle: readStringParam(rawParams, "handle", { required: true }),
          platform: readStringParam(rawParams, "platform", { required: true }),
          score: readNumberParam(rawParams, "score", { required: true }) ?? 0,
          notes: readStringParam(rawParams, "notes", { required: true }),
          email: readStringParam(rawParams, "email") ?? undefined,
          website: readStringParam(rawParams, "website") ?? undefined,
          outreachDraft: readStringParam(rawParams, "outreach_draft") ?? undefined,
          status: "new",
          createdAt: new Date().toISOString(),
        };

        const leads = await loadLeads();
        leads.push(lead);
        await saveLeads(leads);

        return jsonResult({ status: "ok", leadId: lead.id, totalLeads: leads.length });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return jsonResult({ status: "failed", error: message });
      }
    },
  };
}
