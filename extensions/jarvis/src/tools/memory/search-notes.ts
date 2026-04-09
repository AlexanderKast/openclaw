import axios from "axios";
import { Type } from "@sinclair/typebox";
import type { AnyAgentTool } from "openclaw/plugin-sdk/plugin-entry";
import {
  jsonResult,
  readStringParam,
} from "openclaw/plugin-sdk/provider-web-search";
import { config } from "../../../legacy/shared/config.js";

const OBSIDIAN_DB = process.env.OBSIDIAN_DB || "obsidian-vault";

function couchHeaders() {
  const { user, pass } = config.couchdb;
  const auth =
    user && pass
      ? {
          Authorization: `Basic ${Buffer.from(`${user}:${pass}`).toString("base64")}`,
        }
      : {};
  return { "Content-Type": "application/json", ...auth };
}

function couchBase(): string {
  return config.couchdb.url || "http://localhost:5984";
}

const SearchNotesSchema = Type.Object(
  {
    query: Type.String({ description: "Texto a buscar en las notas" }),
  },
  { additionalProperties: false },
);

export function createSearchNotesTool(): AnyAgentTool {
  return {
    name: "jarvis_search_notes",
    label: "Jarvis Search Notes",
    description: "Busca notas en el vault de Obsidian por contenido o titulo.",
    parameters: SearchNotesSchema,
    execute: async (_toolCallId: string, rawParams: Record<string, unknown>) => {
      const queryRaw = readStringParam(rawParams, "query", { required: true });

      try {
        const query = queryRaw.toLowerCase();
        const url = `${couchBase()}/${OBSIDIAN_DB}/_all_docs?include_docs=true`;
        try {
          const res = await axios.get(url, { headers: couchHeaders() });
          const rows = res.data.rows as { doc: Record<string, unknown> }[];
          const matches = rows
            .filter((row) => {
              if (!row.doc) return false;
              const content = String(row.doc.content || "").toLowerCase();
              const notePath = String(row.doc.path || "").toLowerCase();
              return content.includes(query) || notePath.includes(query);
            })
            .map((row) => ({
              path: row.doc.path,
              snippet: String(row.doc.content || "").slice(0, 200),
              updatedAt: row.doc.updatedAt,
            }));
          return jsonResult({
            status: "ok",
            results: matches,
            total: matches.length,
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          return jsonResult({ status: "ok", results: [], error: message });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return jsonResult({ status: "failed", error: message });
      }
    },
  };
}
