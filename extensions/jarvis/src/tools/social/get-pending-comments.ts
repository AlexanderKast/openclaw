import { Type } from "@sinclair/typebox";
import type { AnyAgentTool } from "openclaw/plugin-sdk/plugin-entry";
import {
  jsonResult,
  readStringParam,
  readNumberParam,
} from "openclaw/plugin-sdk/provider-web-search";
import {
  SOCIAL_ACCOUNTS,
  isInstagramApiReady,
  getComments,
  getRecentMedia,
} from "../../../legacy/connectors/instagram-api.js";

const GetPendingCommentsSchema = Type.Object(
  {
    account: Type.String({ description: 'Cuenta (alexander_cast, ugc_colombia, ...) o "all"' }),
    limit: Type.Optional(Type.Number({ description: "Maximo de comentarios. Default 20" })),
  },
  { additionalProperties: false },
);

export function createGetPendingCommentsTool(): AnyAgentTool {
  return {
    name: "jarvis_get_pending_comments",
    label: "Jarvis Get Pending Comments",
    description: "Obtiene comentarios pendientes de responder en una o todas las cuentas de Instagram.",
    parameters: GetPendingCommentsSchema,
    execute: async (_toolCallId: string, rawParams: Record<string, unknown>) => {
      const account = readStringParam(rawParams, "account") ?? "all";
      const limit = readNumberParam(rawParams, "limit") ?? 20;
      try {
        if (!isInstagramApiReady()) {
          return jsonResult({
            status: "failed",
            error: "Instagram API no configurada. Configura META_GRAPH_TOKEN.",
          });
        }
        const accounts = account === "all" ? Object.keys(SOCIAL_ACCOUNTS) : [account];
        const results: Record<string, unknown[]> = {};
        for (const acc of accounts) {
          const cfg = (SOCIAL_ACCOUNTS as Record<string, { igId?: string; instagram?: string }>)[acc];
          if (!cfg?.igId) {
            results[acc] = [{ error: "IG Business ID no configurado para esta cuenta" }];
            continue;
          }
          try {
            const media = await getRecentMedia(cfg.igId, 5);
            const allComments: unknown[] = [];
            for (const post of media as Array<{ id: string; caption?: string }>) {
              const comments = await getComments(post.id, limit);
              allComments.push(
                ...(comments as Array<Record<string, unknown>>).map((c) => ({
                  ...c,
                  postId: post.id,
                  postCaption: post.caption?.slice(0, 100),
                })),
              );
            }
            results[acc] = allComments;
          } catch (e) {
            results[acc] = [{ error: e instanceof Error ? e.message : String(e) }];
          }
        }
        return jsonResult({ status: "ok", results });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return jsonResult({ status: "failed", error: message });
      }
    },
  };
}
