import axios from "axios";
import { Type } from "@sinclair/typebox";
import type { AnyAgentTool } from "openclaw/plugin-sdk/plugin-entry";
import {
  jsonResult,
  readStringParam,
  readNumberParam,
} from "openclaw/plugin-sdk/provider-web-search";
import { getGoogleAccessToken } from "../../../legacy/shared/google-api.js";

const ListEventsSchema = Type.Object(
  {
    calendarId: Type.Optional(Type.String()),
    days: Type.Optional(Type.Number({ description: "Ventana en dias (default 7)" })),
    account: Type.Optional(Type.String()),
  },
  { additionalProperties: false },
);

export function createListCalendarEventsTool(): AnyAgentTool {
  return {
    name: "jarvis_list_calendar_events",
    label: "Jarvis List Calendar Events",
    description: "Lista eventos proximos en un calendario.",
    parameters: ListEventsSchema,
    execute: async (_toolCallId: string, rawParams: Record<string, unknown>) => {
      const calendarId = readStringParam(rawParams, "calendarId") ?? "primary";
      const days = readNumberParam(rawParams, "days") ?? 7;
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
          attendees: ((ev.attendees as Record<string, string>[]) ?? []).map((a) => a.email),
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
