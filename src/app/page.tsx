import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function RootPage() {
  const user = await getCurrentUser();
  if (!user) {
    // Redirects to a route handler that clears a stale session cookie (valid
    // JWT, deleted user) before sending the browser to /login — cookies can't
    // be cleared during a Server Component render. See the matching note in
    // lib/auth.ts's requireRole/requireAnyRole.
    redirect("/api/auth/invalidate-session");
  }
  redirect(user.role === "COACH" ? "/coach/dashboard" : "/member/dashboard");
}
