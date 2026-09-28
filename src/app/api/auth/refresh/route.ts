import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createSessionCookie, getCurrentUser } from "@/lib/auth";
import { roleHomePath } from "@/lib/roles";

// Target of redirectHome(): re-signs the session cookie with the user's
// current effective role so the proxy routes them correctly again.
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.redirect(new URL("/api/auth/signout", request.url));
  }
  await createSessionCookie(user);
  return NextResponse.redirect(new URL(roleHomePath(user.role), request.url));
}
