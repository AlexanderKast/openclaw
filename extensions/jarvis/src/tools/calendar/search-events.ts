import axios from "axios";
import { Type } from "@sinclair/typebox";
import type { AnyAgentTool } from "openclaw/plugin-sdk/plugin-entry";
import {
  jsonResult,
  readStringParam,
  readNumberParam,
} from "openclaw/plugin-sdk/provider-web-search";
import { getGoogleAccessToken } from "../../../legacy/shared/google-api.js";

const SearchEventsSchema = Type.Object(
  {
    calendarId: Type.Optional(Type.String()),
    q: Type.String({ description: "Query de busqueda" }),
    days: Type.Optional(Type.Number({ description: "Ventana en dias (default 30)" })),
    account: Type.Optional(Type.String()),
  },
  { additionalProperties: false },
);

export function createSearchCalendarEventsTool(): AnyAgentTool {
  return {
    name: "jarvis_search_calendar_events",
    label: "Jarvis Search Calendar Events",
    description: "Busca eventos en un calendario por texto.",
    parameters: SearchEventsSchema,
    execute: async (_toolCallId: string, rawParams: Record<string, unknown>) => {
      const calendarId = readStringParam(rawParams, "calendarId") ?? "primary";
      const q = readStringParam(rawParams, "q", { required: true });
      const days = readNumberParam(rawParams, "days") ?? 30;
      const account = readStringParam(rawParams, "account") ?? "founder";

      try {
        const accessToken = await getGoogleAccessToken(account);
        const calId = encodeURIComponent(calendarId);

        const timeMin = new Date().toISOString();
        const timeMax = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

        const { data } = await axios.get(
          `https://www.googleapis.com/calendar/v3/calendars/${calId}/events`,
          {
            params: {
              q,
              timeMin,
              timeMax,
              singleEvents: true,
              orderBy: "startTime",
              maxResults: 20,
            },
            headers: { Authorization: `Bearer ${accessToken}` },
          },
        );

        const events = (data.items ?? []).map((ev: Record<string, unknown>) => ({
          id: ev.id,
          summary: ev.summary,
          start:
            (ev.start as Record<string, string>)?.dateTime ??
            (ev.start as Record<string, string>)?.date,
          end:
            (ev.end as Record<string, string>)?.dateTime ??
            (ev.end as Record<string, string>)?.date,
          description: ev.description,
          htmlLink: ev.htmlLink,
        }));

        return jsonResult({ status: "ok", count: events.length, events });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return jsonResult({ status: "failed", error: message });
      }
    },
  };
}
