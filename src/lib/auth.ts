import "server-only";
import { cache } from "react";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { type Role, type User } from "@/generated/prisma/client";
import { getCurrentClassSession } from "@/lib/classSessions";
import { todayDateKey } from "@/lib/workout";
import { roleHomePath } from "@/lib/roles";
import { effectiveRole } from "@/lib/staffAccess";

const SESSION_COOKIE = "olympus_session";
const SESSION_DURATION_DAYS = 30;

const secretKey = process.env.SESSION_SECRET;
if (!secretKey) {
  throw new Error("SESSION_SECRET environment variable is not set");
}
const encodedKey = new TextEncoder().encode(secretKey);

export interface SessionPayload extends JWTPayload {
  sub: string;
  role: Role;
  name: string;
}

export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, 10);
}

export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash);
}

async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_DAYS}d`)
    .sign(encodedKey);
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, encodedKey, {
      algorithms: ["HS256"],
    });
    return payload as SessionPayload;
  } catch {
    return null;
  }
}

export async function createSessionCookie(user: {
  id: string;
  role: Role;
  name: string;
}) {
  const token = await signSession({ sub: user.id, role: user.role, name: user.name });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_DAYS * 24 * 60 * 60,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

// Memoized per request: several server components/layouts may call this
// during the same render pass, but it should only touch the DB once.
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const session = await getSession();
  if (!session) return null;

  const now = new Date();
  // A request made while a class session is running "checks the member in"
  // for the rest of the calendar day, so the Live Board keeps showing them
  // even after they stop actively using the app mid-session.
  const presentDate = getCurrentClassSession(now) ? todayDateKey() : undefined;

  const user = await prisma.user
    .update({
      where: { id: session.sub },
      data: { lastActiveAt: now, ...(presentDate ? { presentDate } : {}) },
    })
    .catch(() => null);
  if (!user) return null;
  return { ...user, role: effectiveRole(user) };
});

// A still-valid cookie whose user no longer exists must be cleared,
// otherwise the proxy — which only reads the cookie — keeps bouncing /login
// back to the dashboard.
export async function redirectToLogin(): Promise<never> {
  const session = await getSession();
  redirect(session ? "/api/auth/signout" : "/login");
}

// The proxy routes by the role baked into the cookie. If that no longer
// matches the effective role (e.g. a non-allowlisted admin now counts as a
// member), re-issue the cookie first so the two can't redirect in a loop.
async function redirectHome(user: User): Promise<never> {
  const session = await getSession();
  redirect(session?.role !== user.role ? "/api/auth/refresh" : roleHomePath(user.role));
}

export async function requireRole(role: Role): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    return redirectToLogin();
  }
  if (user.role !== role) {
    return redirectHome(user);
  }
  return user;
}

export async function requireAnyRole(roles: Role[]): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    return redirectToLogin();
  }
  if (!roles.includes(user.role)) {
    return redirectHome(user);
  }
  return user;
}
