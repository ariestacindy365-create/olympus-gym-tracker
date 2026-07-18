import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { Role } from "@/generated/prisma/client";

export default async function CoachProgramsPage() {
  const members = await prisma.user.findMany({
    where: { role: Role.MEMBER },
    orderBy: { name: "asc" },
  });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-2xl font-bold">Program Latihan</h1>
        <p className="text-sm text-muted">Pilih member untuk membuat atau mengubah program latihan mingguan.</p>
      </div>

      {members.length === 0 ? (
        <Card>
          <p className="text-sm text-muted">Belum ada member.</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {members.map((member) => (
            <Link key={member.id} href={`/coach/programs/${member.id}`}>
              <Card className="flex items-center justify-between transition hover:border-accent">
                <div>
                  <p className="font-medium">{member.name}</p>
                  <p className="text-xs text-muted">{member.email}</p>
                </div>
                <span className="text-muted">&rarr;</span>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
