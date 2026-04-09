import axios from "axios";
import { Type } from "@sinclair/typebox";
import type { AnyAgentTool } from "openclaw/plugin-sdk/plugin-entry";
import {
  jsonResult,
  readNumberParam,
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

const ListNotesSchema = Type.Object(
  {
    limit: Type.Optional(
      Type.Number({ description: "Maximo de notas a listar (default 50)" }),
    ),
    startkey: Type.Optional(
      Type.String({ description: "Doc ID desde donde empezar" }),
    ),
    endkey: Type.Optional(
      Type.String({ description: "Doc ID donde terminar" }),
    ),
  },
  { additionalProperties: false },
);

export function createListNotesTool(): AnyAgentTool {
  return {
    name: "jarvis_list_notes",
    label: "Jarvis List Notes",
    description: "Lista notas del vault de Obsidian con paginacion.",
    parameters: ListNotesSchema,
    execute: async (_toolCallId: string, rawParams: Record<string, unknown>) => {
      const limit = readNumberParam(rawParams, "limit") ?? 50;
      const startkey = readStringParam(rawParams, "startkey");
      const endkey = readStringParam(rawParams, "endkey");

      try {
        const params: Record<string, unknown> = { limit, include_docs: false };
        if (startkey) params.startkey = JSON.stringify(startkey);
        if (endkey) params.endkey = JSON.stringify(endkey);

        try {
          const res = await axios.get(
            `${couchBase()}/${OBSIDIAN_DB}/_all_docs`,
            { headers: couchHeaders(), params },
          );
          const rows = (res.data.rows as { id: string; key: string }[])
            .filter((r) => !r.id.startsWith("_design/"))
            .map((r) => ({ id: r.id, path: r.id.replace(/_/g, "/") }));
          return jsonResult({
            status: "ok",
            notes: rows,
            total: res.data.total_rows,
            returned: rows.length,
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          return jsonResult({ status: "ok", notes: [], error: message });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return jsonResult({ status: "failed", error: message });
      }
    },
  };
}
