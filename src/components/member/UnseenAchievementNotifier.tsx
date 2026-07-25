"use client";

import { useState } from "react";
import {
  AchievementCelebrationModal,
  type AchievementCelebrationData,
} from "@/components/shared/AchievementCelebrationModal";

interface UnseenBadge {
  code: string;
  name: string;
  description: string;
  icon: string;
}

interface UnseenAchievementNotifierProps {
  memberName: string;
  badges: UnseenBadge[];
}

// Surfaces achievements unlocked outside the member's own actions (a coach
// logging a set/weigh-in on their behalf) the next time they open the app —
// otherwise those unlocks would happen completely silently.
export function UnseenAchievementNotifier({ memberName, badges }: UnseenAchievementNotifierProps) {
  const [celebration, setCelebration] = useState<AchievementCelebrationData | null>(
    badges.length > 0 ? { memberName, badges } : null
  );

  function handleClose() {
    setCelebration(null);
    fetch("/api/member/achievements/mark-seen", { method: "POST" }).catch(() => {});
  }

  if (!celebration) return null;

  return <AchievementCelebrationModal data={celebration} onClose={handleClose} />;
}
