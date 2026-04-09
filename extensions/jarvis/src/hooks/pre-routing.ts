/**
 * Pre-routing hook logic for Jarvis.
 *
 * Ported from jarvis-assistant/src/core/router.ts pre-routing block.
 * Exposed as a pure helper `detectPreHook` that returns which sub-agent
 * should handle the message before the root dispatcher sees it.
 *
 * TODO(phase-4): wire this into `api.registerHook("before_tool_call", ...)`
 * or the equivalent agent pre-dispatch hook once we confirm the exact signature
 * OpenClaw exposes for "intercept before the root agent routes". The plugin API
 * today has `registerHook` with event names like "before_tool_call" and
 * "before_agent_reply" — neither is a perfect fit for "redirect to sub-agent X
 * before the root agent runs". For now this helper is called from our custom
 * commands and (once the seam exists) can be wrapped by a hook handler.
 */

import { isSocialMediaUrl } from "../../legacy/connectors/social-extractor.js";
import { isAgentAllowed } from "./role-acl.js";

// Research trigger: /research email@domain.com
const RESEARCH_TRIGGER = /^\/research\s+(\S+@\S+\.\S+)/i;

// Diagnosis trigger: "diagnostico para @handle" / "analiza @handle" / "/diagnose @handle"
const DIAGNOSIS_TRIGGER =
  /(?:diagn[oó]stic[oa]|an[aá]li[sz][aei]s?|investiga|research).*?@(\w[\w._]{1,30}\w)/i;

// Engine trigger patterns — loose regex set ported from router.ts
const ENGINE_TRIGGERS: RegExp[] = [
  /genera[r]?\s+contenido/i,
  /\/engine/i,
  /daily\s+(report|briefing)/i,
  /genera[r]?\s+reporte/i,
  /motor\s+de\s+contenido/i,
  /content\s+engine/i,
  /genera[r]?\s*guion/i,
  /briefing\s+diario/i,
  /guiones/i,
  /busca.*correos.*noticias/i,
  /busca.*newsletters/i,
  /lee.*emails.*genera/i,
  /revisa.*correos/i,
  /genera.*video.*viral/i,
  /crea.*contenido/i,
  /dame.*guion/i,
];

const URL_REGEX = /https?:\/\/[^\s]+/gi;

export type PreHookDecision = {
  forceAgent: "analyst" | "brand-researcher" | "engine";
  progress?: string;
  payload?: Record<string, string>;
};

// In-memory analyst session registry. Mirrors hasAnalystSession() in legacy
// agents/analyst. In phase 4 the sub-agent itself will push into this set
// when it enters an A/B waiting state.
const ANALYST_SESSIONS = new Set<string>();

export function markAnalystSession(userId: string): void {
  if (userId) ANALYST_SESSIONS.add(userId);
}

export function clearAnalystSession(userId: string): void {
  ANALYST_SESSIONS.delete(userId);
}

export function hasAnalystSession(userId: string): boolean {
  return ANALYST_SESSIONS.has(userId);
}

/**
 * Decide whether a given inbound message should be pre-routed to a specific
 * sub-agent before the root dispatcher runs.
 *
 * Returns `null` when the root agent should handle the message normally.
 */
export function detectPreHook(
  text: string,
  userId: string,
  isOwner: boolean,
  role = "owner",
): PreHookDecision | null {
  const messageText = text || "";

  // Pending analyst A/B session
  if (hasAnalystSession(userId) && isAgentAllowed(role, "analyst")) {
    return { forceAgent: "analyst", progress: "Analizando tu respuesta..." };
  }

  // Social media URL → analyst
  const urls = messageText.match(URL_REGEX) || [];
  const socialUrl = urls.find((url) => {
    try {
      return isSocialMediaUrl(url);
    } catch {
      return false;
    }
  });
  if (socialUrl && isAgentAllowed(role, "analyst")) {
    return {
      forceAgent: "analyst",
      progress: "Vi el link, déjame revisarlo...",
      payload: { url: socialUrl },
    };
  }

  // /research email@domain
  const researchMatch = messageText.match(RESEARCH_TRIGGER);
  if (researchMatch && isAgentAllowed(role, "brand-researcher")) {
    return {
      forceAgent: "brand-researcher",
      progress: "Dale, investigando esa marca...",
      payload: { email: researchMatch[1] },
    };
  }

  // Brand diagnosis by @handle (owner only)
  const diagnosisMatch = messageText.match(DIAGNOSIS_TRIGGER);
  if (diagnosisMatch && isOwner && isAgentAllowed(role, "brand-researcher")) {
    return {
      forceAgent: "brand-researcher",
      progress: "Mirando esa marca, ya te cuento...",
      payload: { handle: diagnosisMatch[1] },
    };
  }

  // Content engine triggers
  if (ENGINE_TRIGGERS.some((re) => re.test(messageText))) {
    if (!isAgentAllowed(role, "engine")) return null;
    return {
      forceAgent: "engine",
      progress: "Generando el contenido del día, dame un momento...",
    };
  }

  return null;
}
