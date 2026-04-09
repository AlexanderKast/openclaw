import axios from "axios";
import { Type } from "@sinclair/typebox";
import type { AnyAgentTool } from "openclaw/plugin-sdk/plugin-entry";
import {
  jsonResult,
  readStringParam,
} from "openclaw/plugin-sdk/provider-web-search";
import { config } from "../../../legacy/shared/config.js";

const CheckMetaAdsSchema = Type.Object(
  {
    action: Type.String({ description: "status | metrics | budget" }),
    campaign_id: Type.Optional(Type.String()),
  },
  { additionalProperties: false },
);

export function createCheckMetaAdsTool(): AnyAgentTool {
  return {
    name: "jarvis_check_meta_ads",
    label: "Jarvis Check Meta Ads",
    description: "Consulta estado, metricas o presupuesto de campanas de Meta Ads via webhook n8n.",
    parameters: CheckMetaAdsSchema,
    execute: async (_toolCallId: string, rawParams: Record<string, unknown>) => {
      const action = readStringParam(rawParams, "action") ?? "status";
      const campaignId = readStringParam(rawParams, "campaign_id");
      try {
        if (!config.metaAds?.webhook) {
          return jsonResult({ status: "failed", error: "META_ADS_WEBHOOK no configurado" });
        }
        const { data } = await axios.post(config.metaAds.webhook, {
          action,
          campaign_id: campaignId ?? null,
          timestamp: new Date().toISOString(),
        });
        return jsonResult({ status: "ok", data });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return jsonResult({ status: "failed", error: message });
      }
    },
  };
}
