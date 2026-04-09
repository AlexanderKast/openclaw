/**
 * Role-based ACL for Jarvis sub-agents.
 *
 * Ported from jarvis-assistant/src/core/router.ts (ROLE_ALLOWED_AGENTS /
 * ROLE_BLOCKED_AGENTS) and src/shared/config.ts (team map).
 */

export type TeamMember = {
  phone: string;
  name: string;
  role: "owner" | "ops" | "community" | "readonly" | string;
  email?: string;
};

// Ported from legacy config.ts team map. Kept static so the plugin does not
// need to reach into legacy env parsing. Users can override via plugin config
// in a later phase.
const TEAM: Record<string, TeamMember> = {
  "573132947776": {
    phone: "573132947776",
    name: "Alexander",
    role: "owner",
    email: "founder@kreoon.com",
  },
  "573113842399": {
    phone: "573113842399",
    name: "Brian",
    role: "ops",
    email: "operaciones@kreoon.com",
  },
  "573044174918": {
    phone: "573044174918",
    name: "Brian2",
    role: "ops",
    email: "operaciones@kreoon.com",
  },
  "573126944694": {
    phone: "573126944694",
    name: "Diana",
    role: "community",
    email: "",
  },
};

// Roles not listed here have full access.
const ROLE_ALLOWED_AGENTS: Partial<Record<string, string[]>> = {
  community: ["analyst"], // Diana: only content analysis
  readonly: [], // No access
};

// Agents explicitly blocked for a role.
const ROLE_BLOCKED_AGENTS: Partial<Record<string, string[]>> = {
  ops: ["memory"], // Brian: everything except memory/obsidian
};

export function resolveMember(phone: string): TeamMember | null {
  if (!phone) return null;
  const normalized = phone.replace(/[^0-9]/g, "");
  return TEAM[normalized] ?? null;
}

export function isAgentAllowed(role: string, agent: string): boolean {
  const allowed = ROLE_ALLOWED_AGENTS[role];
  if (allowed !== undefined) {
    if (allowed.length === 0) return false;
    if (!allowed.includes("all") && !allowed.includes(agent)) return false;
  }
  const blocked = ROLE_BLOCKED_AGENTS[role];
  if (blocked?.includes(agent)) return false;
  return true;
}

export function listTeam(): TeamMember[] {
  return Object.values(TEAM);
}
