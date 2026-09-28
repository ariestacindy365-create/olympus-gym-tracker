import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { clearSessionCookie } from "@/lib/auth";

// A session cookie can be cryptographically valid (correctly signed, not
// expired) while pointing at a user that no longer exists in the DB — see
// the note on requireRole/requireAnyRole in lib/auth.ts. Cookies can only be
// cleared in a Server Action or Route Handler, never during a Server
// Component render, so those functions redirect here instead of clearing
// the cookie themselves. This route is excluded from proxy.ts's matcher
// (it only skips "/api"), so it always runs and reaches /login with the
// stale cookie actually gone.
export async function GET(request: NextRequest) {
  await clearSessionCookie();
  return NextResponse.redirect(new URL("/login", request.url));
}
