import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { clearSessionCookie } from "@/lib/auth";

// Target of redirectToLogin(): server components can't delete cookies, so
// they redirect here to drop a session that no longer maps to an allowed user.
export async function GET(request: NextRequest) {
  await clearSessionCookie();
  return NextResponse.redirect(new URL("/login", request.url));
}
