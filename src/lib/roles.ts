import { type Role } from "@/generated/prisma/client";

// Shared by both server-only code (lib/auth.ts) and client components
// (login page), so it can't import "server-only".
export function roleHomePath(role: Role): string {
  switch (role) {
    case "COACH":
      return "/coach/dashboard";
    case "ADMIN":
      return "/leads/dashboard";
    case "OWNER":
      return "/leads/owner";
    case "MEMBER":
    default:
      return "/member/dashboard";
  }
}
