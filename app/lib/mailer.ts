import "server-only";
import nodemailer from "nodemailer";
import { getServerEnv } from "./env";

export type MailPayload = {
  to: string;
  subject: string;
  html?: string;
  text?: string;
};

let transporter: nodemailer.Transporter | null = null;

export function getMailer() {
  if (transporter) return transporter;
  const env = getServerEnv();
  const host = env.EMAIL_SMTP_HOST;
  const port = Number(env.EMAIL_SMTP_PORT || 587);
  const secure = String(env.EMAIL_SMTP_SECURE || "false").toLowerCase() === "true";

  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: env.EMAIL_SMTP_USER
      ? {
          user: env.EMAIL_SMTP_USER,
          pass: env.EMAIL_SMTP_PASS,
        }
      : undefined,
  });

  return transporter;
}

export async function sendMail(payload: MailPayload) {
  const env = getServerEnv();
  const mailer = getMailer();
  return mailer.sendMail({
    from: env.EMAIL_FROM,
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
    text: payload.text,
  });
}

export function renderTemplate(template: string, variables: Record<string, string>) {
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key) => {
    return variables[key] ?? "";
  });
}
