import fs from "fs/promises";
import path from "path";
import { Type } from "@sinclair/typebox";
import type { AnyAgentTool } from "openclaw/plugin-sdk/plugin-entry";
import {
  jsonResult,
  readStringParam,
} from "openclaw/plugin-sdk/provider-web-search";

const MEMORY_BASE_DIR = "/app/data/memory";

const ListMemoriesSchema = Type.Object(
  {
    namespace: Type.Optional(
      Type.String({ description: 'Espacio de nombres a listar (default: "global")' }),
    ),
  },
  { additionalProperties: false },
);

export function createListMemoriesTool(): AnyAgentTool {
  return {
    name: "jarvis_list_memories",
    label: "Jarvis List Memories",
    description: "Lista todas las claves almacenadas en un namespace de memoria.",
    parameters: ListMemoriesSchema,
    execute: async (_toolCallId: string, rawParams: Record<string, unknown>) => {
      const namespace = readStringParam(rawParams, "namespace") ?? "global";

      try {
        const nsDir = path.join(MEMORY_BASE_DIR, namespace);
        try {
          const files = await fs.readdir(nsDir);
          const keys = files
            .filter((f) => f.endsWith(".json"))
            .map((f) => f.replace(/\.json$/, ""));
          return jsonResult({
            status: "ok",
            namespace,
            keys,
            total: keys.length,
          });
        } catch {
          return jsonResult({ status: "ok", namespace, keys: [], total: 0 });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return jsonResult({ status: "failed", error: message });
      }
    },
  };
}
