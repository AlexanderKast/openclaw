import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";

// Core
import { createRouteToAgentTool } from "./src/tools/core/route-to-agent.js";
import { createDelegateToSubagentTool } from "./src/tools/core/delegate-to-subagent.js";

// WhatsApp
import { createWhatsAppSendTextTool } from "./src/tools/whatsapp/send-text.js";

// Memory (9)
import { createStoreMemoryTool } from "./src/tools/memory/store-memory.js";
import { createRetrieveMemoryTool } from "./src/tools/memory/retrieve-memory.js";
import { createSearchMemoryTool } from "./src/tools/memory/search-memory.js";
import { createListMemoriesTool } from "./src/tools/memory/list-memories.js";
import { createSaveNoteTool } from "./src/tools/memory/save-note.js";
import { createReadNoteTool } from "./src/tools/memory/read-note.js";
import { createSearchNotesTool } from "./src/tools/memory/search-notes.js";
import { createListNotesTool } from "./src/tools/memory/list-notes.js";
import { createVerifyObsidianTool } from "./src/tools/memory/verify-obsidian.js";

// Gmail (6)
import { createSendEmailTool } from "./src/tools/gmail/send-email.js";
import { createReadEmailsTool } from "./src/tools/gmail/read-emails.js";
import { createReadEmailFullTool } from "./src/tools/gmail/read-email-full.js";
import { createReplyToEmailTool } from "./src/tools/gmail/reply-to-email.js";
import { createCreateDraftTool } from "./src/tools/gmail/create-draft.js";
import { createConnectGoogleAccountTool } from "./src/tools/gmail/connect-google-account.js";

// Calendar (7)
import { createCreateCalendarEventTool } from "./src/tools/calendar/create-event.js";
import { createUpdateCalendarEventTool } from "./src/tools/calendar/update-event.js";
import { createDeleteCalendarEventTool } from "./src/tools/calendar/delete-event.js";
import { createListCalendarEventsTool } from "./src/tools/calendar/list-events.js";
import { createSearchCalendarEventsTool } from "./src/tools/calendar/search-events.js";
import { createListCalendarsTool } from "./src/tools/calendar/list-calendars.js";
import { createCreateCalendarTool } from "./src/tools/calendar/create-calendar.js";

// Content (6)
import { createWebSearchTool } from "./src/tools/content/web-search.js";
import { createGenerateCaptionTool } from "./src/tools/content/generate-caption.js";
import { createGenerateHashtagsTool } from "./src/tools/content/generate-hashtags.js";
import { createContentCalendarTool } from "./src/tools/content/content-calendar.js";
import { createWriteCopyTool } from "./src/tools/content/write-copy.js";
import { createUgcBriefTool } from "./src/tools/content/ugc-brief.js";

// Analyst (5)
import { createExtractContentTool } from "./src/tools/analyst/extract-content.js";
import { createAnalyzeStrategyTool } from "./src/tools/analyst/analyze-strategy.js";
import { createExtractProfileTool } from "./src/tools/analyst/extract-profile.js";
import { createGenerateReportTool } from "./src/tools/analyst/generate-report.js";
import { createIsSocialUrlTool } from "./src/tools/analyst/is-social-url.js";

// Social (7)
import { createGetPendingCommentsTool } from "./src/tools/social/get-pending-comments.js";
import { createReplyCommentTool } from "./src/tools/social/reply-comment.js";
import { createBatchReplyCommentsTool } from "./src/tools/social/batch-reply-comments.js";
import { createGetDmsTool } from "./src/tools/social/get-dms.js";
import { createReplyDmTool } from "./src/tools/social/reply-dm.js";
import { createGetAccountStatsTool } from "./src/tools/social/get-account-stats.js";
import { createGenerateReplyTool } from "./src/tools/social/generate-reply.js";

// Lead Hunter (6)
import { createSearchLeadsTool } from "./src/tools/lead-hunter/search-leads.js";
import { createQualifyLeadTool } from "./src/tools/lead-hunter/qualify-lead.js";
import { createStoreLeadTool } from "./src/tools/lead-hunter/store-lead.js";
import { createGetPipelineTool } from "./src/tools/lead-hunter/get-pipeline.js";
import { createGenerateOutreachTool } from "./src/tools/lead-hunter/generate-outreach.js";
import { createUpdateLeadStatusTool } from "./src/tools/lead-hunter/update-lead-status.js";

// Ops misc (5)
import { createCheckMetaAdsTool } from "./src/tools/ops/check-meta-ads.js";
import { createGithubActionTool } from "./src/tools/ops/github-action.js";
import { createSetReminderTool } from "./src/tools/ops/set-reminder.js";
import { createSendTeamMessageTool } from "./src/tools/ops/send-team-message.js";
import { createListGoogleAccountsTool } from "./src/tools/ops/list-google-accounts.js";

// Phase 4: commands + HTTP routes + pre-routing helpers
import { createResearchCommand } from "./src/commands/research.js";
import { createEngineCommand } from "./src/commands/engine.js";
import { createDiagnoseCommand } from "./src/commands/diagnose.js";
import { registerHudRoutes } from "./src/routes/hud.js";
// Pre-routing helper is exported for future hook integration.
// See src/hooks/pre-routing.ts — TODO(phase-4) on hook wiring.
export { detectPreHook } from "./src/hooks/pre-routing.js";

/**
 * Jarvis plugin para OpenClaw.
 *
 * Registra ~53 tools que envuelven los connectors y handlers legacy del
 * proyecto jarvis-assistant. En fase 3 se añadirán sub-agentes via
 * api.runtime.subagent y los entrypoints (HTTP routes, hooks, commands).
 */
export default definePluginEntry({
  id: "jarvis",
  name: "Jarvis",
  description:
    "Asistente personal del ecosistema Kreoon (parcero). Sub-agentes y connectors propietarios.",
  register(api) {
    // Core
    api.registerTool(createRouteToAgentTool()); // legacy stub (compat)
    api.registerTool(createDelegateToSubagentTool(api));

    // WhatsApp
    api.registerTool(createWhatsAppSendTextTool());

    // Memory
    api.registerTool(createStoreMemoryTool());
    api.registerTool(createRetrieveMemoryTool());
    api.registerTool(createSearchMemoryTool());
    api.registerTool(createListMemoriesTool());
    api.registerTool(createSaveNoteTool());
    api.registerTool(createReadNoteTool());
    api.registerTool(createSearchNotesTool());
    api.registerTool(createListNotesTool());
    api.registerTool(createVerifyObsidianTool());

    // Gmail
    api.registerTool(createSendEmailTool());
    api.registerTool(createReadEmailsTool());
    api.registerTool(createReadEmailFullTool());
    api.registerTool(createReplyToEmailTool());
    api.registerTool(createCreateDraftTool());
    api.registerTool(createConnectGoogleAccountTool());

    // Calendar
    api.registerTool(createCreateCalendarEventTool());
    api.registerTool(createUpdateCalendarEventTool());
    api.registerTool(createDeleteCalendarEventTool());
    api.registerTool(createListCalendarEventsTool());
    api.registerTool(createSearchCalendarEventsTool());
    api.registerTool(createListCalendarsTool());
    api.registerTool(createCreateCalendarTool());

    // Content
    api.registerTool(createWebSearchTool());
    api.registerTool(createGenerateCaptionTool());
    api.registerTool(createGenerateHashtagsTool());
    api.registerTool(createContentCalendarTool());
    api.registerTool(createWriteCopyTool());
    api.registerTool(createUgcBriefTool());

    // Analyst
    api.registerTool(createExtractContentTool());
    api.registerTool(createAnalyzeStrategyTool());
    api.registerTool(createExtractProfileTool());
    api.registerTool(createGenerateReportTool());
    api.registerTool(createIsSocialUrlTool());

    // Social
    api.registerTool(createGetPendingCommentsTool());
    api.registerTool(createReplyCommentTool());
    api.registerTool(createBatchReplyCommentsTool());
    api.registerTool(createGetDmsTool());
    api.registerTool(createReplyDmTool());
    api.registerTool(createGetAccountStatsTool());
    api.registerTool(createGenerateReplyTool());

    // Lead Hunter
    api.registerTool(createSearchLeadsTool());
    api.registerTool(createQualifyLeadTool());
    api.registerTool(createStoreLeadTool());
    api.registerTool(createGetPipelineTool());
    api.registerTool(createGenerateOutreachTool());
    api.registerTool(createUpdateLeadStatusTool());

    // Ops misc
    api.registerTool(createCheckMetaAdsTool());
    api.registerTool(createGithubActionTool());
    api.registerTool(createSetReminderTool());
    api.registerTool(createSendTeamMessageTool());
    api.registerTool(createListGoogleAccountsTool());

    // === Phase 4: custom slash commands ===
    api.registerCommand(createResearchCommand(api));
    api.registerCommand(createEngineCommand(api));
    api.registerCommand(createDiagnoseCommand(api));

    // === Phase 4: HTTP routes for the web HUD ===
    registerHudRoutes(api);

    // === Phase 4: pre-routing hook ===
    // TODO(phase-4): wire `detectPreHook` to `api.registerHook(...)` once we
    // confirm which event name corresponds to "before the root agent dispatches".
    // Current SDK exposes `before_tool_call` / `before_agent_reply` / etc. —
    // none is a clean fit for "force delegation to sub-agent X before the
    // root dispatcher runs". For now pre-routing decisions are consumed by
    // the slash commands above and by the sub-agents directly (phase 4b).
  },
});
