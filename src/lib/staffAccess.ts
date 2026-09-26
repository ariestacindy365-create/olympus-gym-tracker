import "server-only";
import { type Role } from "@/generated/prisma/client";

// Only these people may use the staff (non-member) views. Anyone else holding
// a COACH/ADMIN/OWNER role — e.g. an extra admin created with the invite
// code — can't log in, and an existing session stops working.
//
// Override per deployment with comma-separated env vars (COACH_EMAILS,
// ADMIN_EMAILS, OWNER_EMAILS) if the real accounts use different emails.
const DEFAULT_STAFF_EMAILS: Record<Exclude<Role, "MEMBER">, string[]> = {
  COACH: ["cindy@olympus.gym", "ari@olympus.gym"],
  ADMIN: ["sekar@olympus.gym", "esti@olympus.gym"],
  OWNER: ["owner@olympus.gym"],
};

const ENV_KEYS: Record<Exclude<Role, "MEMBER">, string> = {
  COACH: "COACH_EMAILS",
  ADMIN: "ADMIN_EMAILS",
  OWNER: "OWNER_EMAILS",
};

function allowedEmails(role: Exclude<Role, "MEMBER">): string[] {
  const fromEnv = process.env[ENV_KEYS[role]];
  const list = fromEnv ? fromEnv.split(",") : DEFAULT_STAFF_EMAILS[role];
  return list.map((e) => e.trim().toLowerCase()).filter(Boolean);
}

export function isStaffEmailAllowed(role: Role, email: string): boolean {
  if (role === "MEMBER") return true;
  return allowedEmails(role).includes(email.trim().toLowerCase());
}
