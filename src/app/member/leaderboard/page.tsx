import { redirect } from "next/navigation";

// Peringkat now lives as a tab on the Feed page.
export default function MemberLeaderboardPage() {
  redirect("/member/feed?tab=peringkat");
}
