import { redirect } from "next/navigation";
import { getCurrentUser, redirectToLogin } from "@/lib/auth";
import { roleHomePath } from "@/lib/roles";

export default async function RootPage() {
  const user = await getCurrentUser();
  if (!user) {
    return redirectToLogin();
  }
  redirect(roleHomePath(user.role));
}
