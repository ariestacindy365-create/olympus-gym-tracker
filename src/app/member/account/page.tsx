import { getCurrentUser } from "@/lib/auth";
import { Card } from "@/components/ui/Card";
import { ChangeEmailForm } from "@/components/member/ChangeEmailForm";
import { ChangePinForm } from "@/components/member/ChangePinForm";
import { StoryCharacterSetting } from "@/components/member/StoryCharacterPicker";
import { LeaderboardOptOutToggle } from "@/components/member/LeaderboardOptOutToggle";
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

      <Card>
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
        <h2 className="mb-3 font-display text-lg font-semibold">Peringkat Bulanan</h2>
        <LeaderboardOptOutToggle initialOptOut={user.leaderboardOptOut} />
      </Card>

      <Card>
        <h2 className="mb-1 font-display text-lg font-semibold">Ubah PIN</h2>
        <p className="mb-4 text-xs text-muted">PIN 4 digit ini dipakai untuk login.</p>
        <ChangePinForm />
      </Card>
    </div>
  );
}
