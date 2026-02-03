import "server-only";
import { getServerEnv } from "./env";

export type EmailTemplate = {
  key: string;
  subject: string;
  body: string;
};

export async function fetchEmailTemplate(key: string): Promise<EmailTemplate | null> {
  const env = getServerEnv();
  const baseUrl = env.BANKAPI_BASE_URL || "http://localhost:3001";
  const headers: Record<string, string> = {};
  if (env.BANKAPI_ADMIN_KEY) {
    headers["X-Admin-Key"] = env.BANKAPI_ADMIN_KEY;
  }

  const res = await fetch(`${baseUrl}/api/email-templates`, { headers, cache: "no-store" });
  if (!res.ok) return null;
  const data = await res.json();
  const list = (data.templates || []) as EmailTemplate[];
  return list.find((t) => t.key === key) || null;
}
