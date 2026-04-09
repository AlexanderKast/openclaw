import axios from "axios";
import { Type } from "@sinclair/typebox";
import type { AnyAgentTool } from "openclaw/plugin-sdk/plugin-entry";
import {
  jsonResult,
  readStringParam,
  readStringArrayParam,
} from "openclaw/plugin-sdk/provider-web-search";
import { getGoogleAccessToken } from "../../../legacy/shared/google-api.js";

const CreateEventSchema = Type.Object(
  {
    calendarId: Type.Optional(Type.String({ description: "Calendar ID (default primary)" })),
    title: Type.String({ description: "Titulo del evento" }),
    start: Type.String({ description: "ISO datetime inicio" }),
    end: Type.String({ description: "ISO datetime fin" }),
    description: Type.Optional(Type.String()),
    attendees: Type.Optional(Type.Array(Type.String())),
    colorId: Type.Optional(Type.String()),
    account: Type.Optional(Type.String({ description: "Cuenta (default founder)" })),
  },
  { additionalProperties: false },
);

export function createCreateCalendarEventTool(): AnyAgentTool {
  return {
    name: "jarvis_create_calendar_event",
    label: "Jarvis Create Calendar Event",
    description: "Crea un evento en Google Calendar con Meet y verifica conflictos.",
    parameters: CreateEventSchema,
    execute: async (_toolCallId: string, rawParams: Record<string, unknown>) => {
      const calendarId = readStringParam(rawParams, "calendarId") ?? "primary";
      const title = readStringParam(rawParams, "title", { required: true });
      const start = readStringParam(rawParams, "start", { required: true });
      const end = readStringParam(rawParams, "end", { required: true });
      const description = readStringParam(rawParams, "description");
      const attendees = readStringArrayParam(rawParams, "attendees") ?? [];
      const colorId = readStringParam(rawParams, "colorId");
      const account = readStringParam(rawParams, "account") ?? "founder";

      try {
        const accessToken = await getGoogleAccessToken(account);
        const calId = encodeURIComponent(calendarId);

        const conflictCheck = await axios.get(
          `https://www.googleapis.com/calendar/v3/calendars/${calId}/events`,
          {
            params: {
              timeMin: new Date(start).toISOString(),
              timeMax: new Date(end).toISOString(),
              singleEvents: true,
              orderBy: "startTime",
              maxResults: 10,
            },
            headers: { Authorization: `Bearer ${accessToken}` },
          },
        );

        const conflicts = (conflictCheck.data.items ?? [])
          .filter((ev: Record<string, unknown>) => ev.status !== "cancelled")
          .map((ev: Record<string, unknown>) => ({
            summary: ev.summary,
            start:
              (ev.start as Record<string, string>)?.dateTime ??
              (ev.start as Record<string, string>)?.date,
            end:
              (ev.end as Record<string, string>)?.dateTime ??
              (ev.end as Record<string, string>)?.date,
          }));

        if (conflicts.length > 0) {
          return jsonResult({
            status: "failed",
            conflict: true,
            error: `Hay ${conflicts.length} evento(s) en ese horario. Revisa antes de crear.`,
            existingEvents: conflicts,
            proposedEvent: { title, start, end },
          });
        }

        const event: Record<string, unknown> = {
          summary: title,
          start: { dateTime: start, timeZone: "America/Bogota" },
          end: { dateTime: end, timeZone: "America/Bogota" },
          conferenceData: {
            createRequest: {
              requestId: `jarvis-${Date.now()}`,
              conferenceSolutionKey: { type: "hangoutsMeet" },
            },
          },
        };

        if (description) event.description = description;
        if (colorId) event.colorId = colorId;
        if (attendees.length) {
          event.attendees = attendees.map((email) => ({ email }));
        }

        const { data } = await axios.post(
          `https://www.googleapis.com/calendar/v3/calendars/${calId}/events`,
          event,
          {
            params: { sendNotifications: true, conferenceDataVersion: 1 },
            headers: { Authorization: `Bearer ${accessToken}` },
          },
        );

        const meetLink =
          data.conferenceData?.entryPoints?.find(
            (e: Record<string, string>) => e.entryPointType === "video",
          )?.uri || null;

        return jsonResult({
          status: "ok",
          eventId: data.id,
          htmlLink: data.htmlLink,
          meetLink,
          summary: data.summary,
          start: data.start,
          end: data.end,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return jsonResult({ status: "failed", error: message });
      }
    },
  };
}
