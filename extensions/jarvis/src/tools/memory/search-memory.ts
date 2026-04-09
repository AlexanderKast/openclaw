import fs from "fs/promises";
import path from "path";
import { Type } from "@sinclair/typebox";
import type { AnyAgentTool } from "openclaw/plugin-sdk/plugin-entry";
import {
  jsonResult,
  readStringParam,
} from "openclaw/plugin-sdk/provider-web-search";

const MEMORY_BASE_DIR = "/app/data/memory";

const SearchMemorySchema = Type.Object(
  {
    query: Type.String({ description: "Texto a buscar en las memorias" }),
    namespace: Type.Optional(
      Type.String({ description: "Espacio de nombres donde buscar (opcional)" }),
    ),
  },
  { additionalProperties: false },
);

export function createSearchMemoryTool(): AnyAgentTool {
  return {
    name: "jarvis_search_memory",
    label: "Jarvis Search Memory",
    description: "Busca en la memoria de Jarvis por contenido textual.",
    parameters: SearchMemorySchema,
    execute: async (_toolCallId: string, rawParams: Record<string, unknown>) => {
      const queryRaw = readStringParam(rawParams, "query", { required: true });
      const namespace = readStringParam(rawParams, "namespace");

      try {
        const query = queryRaw.toLowerCase();
        const results: {
          namespace: string;
          key: string;
          value: string;
          score: number;
        }[] = [];

        const namespacesToSearch: string[] = [];
        if (namespace) {
          namespacesToSearch.push(namespace);
        } else {
          try {
            const entries = await fs.readdir(MEMORY_BASE_DIR, {
              withFileTypes: true,
            });
            for (const entry of entries) {
              if (entry.isDirectory()) namespacesToSearch.push(entry.name);
            }
          } catch {
            return jsonResult({ status: "ok", results: [], total: 0 });
          }
        }

        for (const ns of namespacesToSearch) {
          const nsDir = path.join(MEMORY_BASE_DIR, ns);
          try {
            const files = await fs.readdir(nsDir);
            for (const file of files) {
              if (!file.endsWith(".json")) continue;
              try {
                const raw = await fs.readFile(path.join(nsDir, file), "utf-8");
                const data = JSON.parse(raw);
                const combined = `${data.key} ${data.value}`.toLowerCase();
                if (combined.includes(query)) {
                  results.push({
                    namespace: ns,
                    key: data.key,
                    value: data.value,
                    score: 1,
                  });
                }
              } catch {
                // skip malformed
              }
            }
          } catch {
            // skip missing
          }
        }

        return jsonResult({ status: "ok", results, total: results.length });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return jsonResult({ status: "failed", error: message });
      }
    },
  };
}
