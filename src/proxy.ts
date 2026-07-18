import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "olympus_session";
const secretKey = process.env.SESSION_SECRET;
const encodedKey = secretKey ? new TextEncoder().encode(secretKey) : null;

type SessionRole = "COACH" | "MEMBER";

async function getSessionRole(request: NextRequest): Promise<SessionRole | null> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token || !encodedKey) return null;
  try {
    const { payload } = await jwtVerify(token, encodedKey, { algorithms: ["HS256"] });
    const role = payload.role;
    return role === "COACH" || role === "MEMBER" ? role : null;
  } catch {
    return null;
  }
}

function dashboardFor(role: SessionRole) {
  return role === "COACH" ? "/coach/dashboard" : "/member/dashboard";
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const role = await getSessionRole(request);

  const isMemberRoute = pathname.startsWith("/member");
  const isCoachRoute = pathname.startsWith("/coach");
  const isAuthRoute = pathname === "/login" || pathname === "/register";

  if (isMemberRoute && role !== "MEMBER") {
    return NextResponse.redirect(
      new URL(role ? dashboardFor(role) : "/login", request.url)
    );
  }

  if (isCoachRoute && role !== "COACH") {
    return NextResponse.redirect(
      new URL(role ? dashboardFor(role) : "/login", request.url)
    );
  }

  if (isAuthRoute && role) {
    return NextResponse.redirect(new URL(dashboardFor(role), request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
