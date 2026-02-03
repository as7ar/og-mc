import "server-only";

const REQUIRED_ENV = [
  "DISCORD_CLIENT_ID",
  "DISCORD_CLIENT_SECRET",
  "DISCORD_REDIRECT_URI",
  "ADMIN_DISCORD_IDS",
];

export type ServerEnv = {
  DISCORD_CLIENT_ID: string;
  DISCORD_CLIENT_SECRET: string;
  DISCORD_REDIRECT_URI: string;
  SESSION_SECRET: string;
  ADMIN_DISCORD_IDS: string;
  BASE_URL?: string;
  BANKAPI_BASE_URL?: string;
  BANKAPI_ADMIN_KEY?: string;
};

export function assertServerEnv(): ServerEnv {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key] || process.env[key]?.trim() === "");
  if (missing.length > 0) {
    console.error(`[env] Missing required environment variables: ${missing.join(", ")}`);
    throw new Error("Missing required environment variables. Check server logs for details.");
  }

  const secret = process.env.SESSION_SECRET?.trim() || "";
  if (secret.length < 32) {
    const crypto = require("crypto");
    process.env.SESSION_SECRET = crypto.randomBytes(32).toString("hex");
    console.warn("[env] SESSION_SECRET too short or missing. Generated a new secret for this server start.");
  }

  return {
    DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID!,
    DISCORD_CLIENT_SECRET: process.env.DISCORD_CLIENT_SECRET!,
    DISCORD_REDIRECT_URI: process.env.DISCORD_REDIRECT_URI!,
    SESSION_SECRET: process.env.SESSION_SECRET!,
    ADMIN_DISCORD_IDS: process.env.ADMIN_DISCORD_IDS!,
    BASE_URL: process.env.BASE_URL,
    BANKAPI_BASE_URL: process.env.BANKAPI_BASE_URL,
    BANKAPI_ADMIN_KEY: process.env.BANKAPI_ADMIN_KEY,
  };
}

export function getServerEnv(): ServerEnv {
  return assertServerEnv();
}
