import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { Card } from "@/components/ui/Card";
import { ChangeEmailForm } from "@/components/member/ChangeEmailForm";
import { ChangePinForm } from "@/components/member/ChangePinForm";
import { StoryCharacterSetting } from "@/components/member/StoryCharacterPicker";
import { LeaderboardOptOutToggle } from "@/components/member/LeaderboardOptOutToggle";
import { FeedVisibilitySetting } from "@/components/member/FeedVisibilitySetting";
import { lifterFromStored, skinToneFromStored } from "@/lib/volumeStory";

export default async function MemberAccountPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-2xl font-bold">Akun Saya</h1>
        <p className="text-sm text-muted">{user.name}</p>
      </div>

      <Card>
        <h2 className="mb-1 font-display text-lg font-semibold">Ubah Email</h2>
        <p className="mb-4 text-xs text-muted">Email ini dipakai untuk login. Pastikan email masih aktif.</p>
        <ChangeEmailForm currentEmail={user.email} />
      </Card>

      <Card id="karakter" className="scroll-mt-24">
        <h2 className="mb-1 font-display text-lg font-semibold">Karakter Kartu Share</h2>
        <p className="mb-4 text-xs text-muted">
          Karakter yang mengangkat beban di kartu volume yang kamu bagikan ke Instagram Story atau WhatsApp.
        </p>
        <StoryCharacterSetting
          initialCharacter={lifterFromStored(user.storyCharacter)}
          initialSkinTone={skinToneFromStored(user.storySkinTone)}
        />
      </Card>

      <Card>
        <h2 className="mb-1 font-display text-lg font-semibold">Notifikasi</h2>
        <p className="mb-3 text-xs text-muted">Notifikasi di HP dan pengingat program pagi.</p>
        <Link href="/member/notifikasi" className="text-sm font-semibold text-accent hover:underline">
          🔔 Atur notifikasi →
        </Link>
      </Card>

      <Card>
        <h2 className="mb-3 font-display text-lg font-semibold">Feed &amp; Peringkat</h2>
        <div className="flex flex-col gap-4">
          <FeedVisibilitySetting initial={user.feedVisibility} />
          <LeaderboardOptOutToggle initialOptOut={user.leaderboardOptOut} />
        </div>
      </Card>

      <Card>
        <h2 className="mb-1 font-display text-lg font-semibold">Ubah PIN</h2>
        <p className="mb-4 text-xs text-muted">PIN 4 digit ini dipakai untuk login.</p>
        <ChangePinForm />
      </Card>
    </div>
  );
}
