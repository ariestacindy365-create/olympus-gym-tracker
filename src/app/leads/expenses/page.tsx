import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ExpenseForm } from "@/components/leads/ExpenseForm";
import { formatRupiah, EXPENSE_CATEGORY_LABEL } from "@/lib/packages";

export default async function ExpensesPage() {
  await requireRole("OWNER");

  const recentExpenses = await prisma.expense.findMany({
    orderBy: { paidAt: "desc" },
    take: 30,
    include: { createdBy: { select: { name: true } } },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Pengeluaran</h1>
        <p className="text-sm text-muted">Catat biaya operasional bisnis — sewa, gaji, alat, dan lainnya.</p>
      </div>

      <ExpenseForm />

      <Card>
        <h2 className="mb-3 font-display text-lg font-semibold">Riwayat Pengeluaran</h2>
        {recentExpenses.length === 0 ? (
          <p className="text-sm text-muted">Belum ada pengeluaran tercatat.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {recentExpenses.map((expense) => (
              <li
                key={expense.id}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3 last:border-0 last:pb-0"
              >
                <div>
                  <p className="text-sm font-medium">
                    {EXPENSE_CATEGORY_LABEL[expense.category] ?? expense.category} · {formatRupiah(expense.amount)}
                  </p>
                  <p className="text-xs text-muted">
                    {expense.paidAt.toLocaleDateString("id-ID")} · oleh {expense.createdBy.name}
                    {expense.description && ` · ${expense.description}`}
                  </p>
                </div>
                {expense.proofImageFileId && (
                  <a href={`/api/expenses/${expense.id}/proof`} target="_blank" rel="noreferrer">
                    <Button variant="secondary" className="px-3 py-1.5 text-xs">
                      Lihat Bukti
                    </Button>
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
