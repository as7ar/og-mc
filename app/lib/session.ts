import "server-only";
import { cookies } from "next/headers";
import { getIronSession, SessionOptions } from "iron-session";
import { getServerEnv } from "./env";

export type SessionData = {
  discordId?: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  isAdmin?: boolean;
  email?: string;
};

const sessionOptions: SessionOptions = {
  cookieName: "og_session",
  password: getServerEnv().SESSION_SECRET,
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  },
};

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}
