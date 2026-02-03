import "server-only";
import { getServerEnv } from "./env";

export function getAdminIdSet(): Set<string> {
  const { ADMIN_DISCORD_IDS } = getServerEnv();
  const ids = ADMIN_DISCORD_IDS.split(",").map((id) => id.trim()).filter(Boolean);
  return new Set(ids);
}

export function isAdminDiscordId(discordId?: string | null): boolean {
  if (!discordId) return false;
  return getAdminIdSet().has(discordId);
}
