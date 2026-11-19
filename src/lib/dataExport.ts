import "server-only";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { KIND_LABEL, creditsLeft } from "@/lib/fitquarter";
import { NO_EXPIRY_END } from "@/lib/packageRules";
import { BOOKING_STATUS_LABEL, sessionById } from "@/lib/bookingRules";
import { PAYMENT_METHOD_LABEL, EXPENSE_CATEGORY_LABEL } from "@/lib/packages";
import { STATUS_LABEL, SOURCE_LABEL } from "@/lib/leadStatusLabels";
import { looksLikeWaNumber } from "@/lib/whatsapp";
import { jakartaToday } from "@/lib/birthDate";
import { type ExportSection, dayOfKey, jakartaStamp, periodBounds } from "@/lib/exportRules";

type Cell = string | number;
interface Sheet {
  name: string;
  header: string[];
  rows: Cell[][];
  /** Column indexes holding rupiah amounts (shown as 1.234.567). */
  money?: number[];
}

const label = (map: Record<string, string>, key: string | null | undefined) => (key ? (map[key] ?? key) : "");

async function memberSheets(): Promise<Sheet[]> {
  const today = jakartaToday();
  const [users, memberships, imported, leads] = await Promise.all([
    prisma.user.findMany({
      where: { role: "MEMBER" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true, birthDate: true, memberCode: true, createdAt: true, lastActiveAt: true },
    }),
    prisma.membership.findMany({
      orderBy: [{ expiresAt: "desc" }],
      include: { user: { select: { name: true, email: true } }, importedMember: { select: { name: true, email: true } } },
    }),
    prisma.importedMember.findMany({ where: { userId: { not: null } }, select: { userId: true, phone: true } }),
    prisma.lead.findMany({ where: { userId: { not: null }, deletedAt: null }, orderBy: { capturedAt: "desc" }, select: { userId: true, waNumber: true } }),
  ]);
  const phoneOf = new Map<string, string>();
  for (const l of leads) if (l.userId && l.waNumber && !phoneOf.has(l.userId)) phoneOf.set(l.userId, l.waNumber);
  for (const i of imported) if (i.userId && !phoneOf.has(i.userId) && looksLikeWaNumber(i.phone)) phoneOf.set(i.userId, i.phone!);

  const statusOf = (m: { startsAt: Date; expiresAt: Date }) => (dayOfKey(m.startsAt) > today ? "Belum mulai" : dayOfKey(m.expiresAt) < today ? "Berakhir" : "Aktif");
  const activeByUser = new Map<string, string[]>();
  for (const m of memberships) if (m.userId && statusOf(m) === "Aktif") activeByUser.set(m.userId, [...(activeByUser.get(m.userId) ?? []), m.packageName]);

  return [
    {
      name: "Member",
      header: ["Nama", "Email", "No. WhatsApp", "Tanggal lahir", "Kode member", "Daftar di aplikasi", "Terakhir aktif", "Paket aktif"],
      rows: users.map((u) => [
        u.name,
        u.email,
        phoneOf.get(u.id) ?? "",
        dayOfKey(u.birthDate),
        u.memberCode ?? "",
        jakartaStamp(u.createdAt, false),
        jakartaStamp(u.lastActiveAt, false),
        (activeByUser.get(u.id) ?? []).join(", "),
      ]),
    },
    {
      name: "Paket",
      header: ["Member", "Email", "Punya akun", "Paket", "Jenis", "Booking kelas", "Kredit", "Terpakai", "Sisa", "Mulai", "Berakhir", "Status", "Sumber"],
      rows: memberships
        .map((m) => {
          const who = m.user ?? m.importedMember;
          const left = creditsLeft(m);
          const end = dayOfKey(m.expiresAt);
          return [
            who?.name ?? "",
            who?.email ?? "",
            m.userId ? "Ya" : "Belum",
            m.packageName,
            KIND_LABEL[m.kind] ?? m.kind,
            m.canBook ? "Ya" : "Tidak",
            m.credits == null ? "Unlimited" : m.credits,
            m.credits == null ? "" : m.creditsUsed,
            left == null ? "Unlimited" : left,
            dayOfKey(m.startsAt),
            end === NO_EXPIRY_END ? "Tidak hangus" : end,
            statusOf(m),
            m.sourceRef ? "FitQuarter" : m.orderId ? "Aplikasi (transfer)" : m.createdById ? "Meja admin" : "",
          ] as Cell[];
        })
        .sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
    },
  ];
}

async function financeSheets(from: string, to: string): Promise<Sheet[]> {
  const { start, end } = periodBounds(from, to);
  const [payments, sales, expenses] = await Promise.all([
    prisma.payment.findMany({
      where: { deletedAt: null, paidAt: { gte: start, lt: end } },
      orderBy: { paidAt: "asc" },
      include: { lead: { select: { name: true, waNumber: true } }, createdBy: { select: { name: true } } },
    }),
    prisma.sale.findMany({ where: { deletedAt: null, createdAt: { gte: start, lt: end } }, orderBy: { createdAt: "asc" }, include: { createdBy: { select: { name: true } } } }),
    prisma.expense.findMany({ where: { paidAt: { gte: start, lt: end } }, orderBy: { paidAt: "asc" }, include: { createdBy: { select: { name: true } } } }),
  ]);
  const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
  const paymentTotal = sum(payments.map((p) => p.amount));
  const salesTotal = sum(sales.map((s) => s.price));
  const expenseTotal = sum(expenses.map((e) => e.amount));
  const byMethod = new Map<string, number>();
  for (const x of [...payments.map((p) => [p.paymentMethod, p.amount] as const), ...sales.map((s) => [s.paymentMethod, s.price] as const)]) {
    byMethod.set(x[0], (byMethod.get(x[0]) ?? 0) + x[1]);
  }
  return [
    {
      name: "Ringkasan",
      header: ["Keterangan", "Jumlah"],
      money: [1],
      rows: [
        ["Periode", `${from} s/d ${to}`],
        ["Pembayaran paket", paymentTotal],
        ["Penjualan kasir", salesTotal],
        ["Total pemasukan", paymentTotal + salesTotal],
        ["Pengeluaran", expenseTotal],
        ["Selisih (pemasukan - pengeluaran)", paymentTotal + salesTotal - expenseTotal],
        ["", ""],
        ["Pemasukan per cara bayar", ""],
        ...[...byMethod.entries()].sort((a, b) => b[1] - a[1]).map(([m, v]) => [`  ${label(PAYMENT_METHOD_LABEL, m)}`, v] as Cell[]),
      ],
    },
    {
      name: "Pembayaran",
      header: ["Tanggal", "Nama", "No. WhatsApp", "Paket", "Nominal", "Cara bayar", "Berlaku sampai", "Dicatat oleh", "Catatan"],
      money: [4],
      rows: payments.map((p) => [
        jakartaStamp(p.paidAt),
        p.lead.name,
        p.lead.waNumber,
        p.packageName,
        p.amount,
        label(PAYMENT_METHOD_LABEL, p.paymentMethod),
        jakartaStamp(p.expiresAt, false),
        p.createdBy.name,
        p.note ?? "",
      ]),
    },
    {
      name: "Kasir",
      header: ["Tanggal", "Produk", "Harga", "Cara bayar", "Dicatat oleh", "Catatan"],
      money: [2],
      rows: sales.map((s) => [jakartaStamp(s.createdAt), s.productName, s.price, label(PAYMENT_METHOD_LABEL, s.paymentMethod), s.createdBy.name, s.note ?? ""]),
    },
    {
      name: "Pengeluaran",
      header: ["Tanggal", "Kategori", "Keterangan", "Nominal", "Dicatat oleh"],
      money: [3],
      rows: expenses.map((e) => [jakartaStamp(e.paidAt), label(EXPENSE_CATEGORY_LABEL, e.category), e.description ?? "", e.amount, e.createdBy.name]),
    },
  ];
}

async function leadSheets(from: string, to: string): Promise<Sheet[]> {
  const [leads, bookings] = await Promise.all([
    prisma.lead.findMany({ where: { deletedAt: null }, orderBy: { capturedAt: "desc" }, include: { capturedBy: { select: { name: true } } } }),
    prisma.classBooking.findMany({
      where: { classDate: { gte: new Date(`${from}T00:00:00Z`), lte: new Date(`${to}T00:00:00Z`) } },
      orderBy: [{ classDate: "asc" }, { sessionId: "asc" }, { createdAt: "asc" }],
      include: { user: { select: { name: true, email: true } }, addedBy: { select: { name: true } } },
    }),
  ]);
  return [
    {
      name: "Lead",
      header: ["Nama", "No. WhatsApp", "Sumber", "Status", "Masuk", "Dicatat oleh", "Mulai trial", "Jadi member", "Balasan"],
      rows: leads.map((l) => [
        l.name,
        l.waNumber,
        label(SOURCE_LABEL, l.source),
        label(STATUS_LABEL, l.status),
        jakartaStamp(l.capturedAt),
        l.capturedBy.name,
        jakartaStamp(l.trialMarkedAt, false),
        jakartaStamp(l.convertedAt, false),
        l.replyCount,
      ]),
    },
    {
      name: "Booking kelas",
      header: ["Tanggal kelas", "Kelas", "Member", "Email", "Status", "Check-in", "Ditambahkan oleh", "Dibuat"],
      rows: bookings.map((b) => [
        dayOfKey(b.classDate),
        sessionById(b.sessionId)?.name ?? b.sessionId,
        b.user.name,
        b.user.email,
        BOOKING_STATUS_LABEL[b.status] ?? b.status,
        jakartaStamp(b.checkedInAt),
        b.addedBy?.name ?? "Member sendiri",
        jakartaStamp(b.createdAt),
      ]),
    },
  ];
}

function toWorksheet(s: Sheet): XLSX.WorkSheet {
  const ws = XLSX.utils.aoa_to_sheet([s.header, ...s.rows]);
  // Widths from the longest value in each column (capped).
  ws["!cols"] = s.header.map((h, c) => ({ wch: Math.min(48, Math.max(h.length, ...s.rows.map((r) => String(r[c] ?? "").length)) + 2) }));
  ws["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: Math.max(0, s.rows.length), c: s.header.length - 1 } }) };
  for (const c of s.money ?? []) {
    for (let r = 1; r <= s.rows.length; r++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      if (cell && cell.t === "n") cell.z = "#,##0";
    }
  }
  return ws;
}

/** The chosen sections as one .xlsx file, a tab per kind of data. */
export async function buildExport(sections: ExportSection[], from: string, to: string): Promise<Buffer> {
  const sheets: Sheet[] = [];
  if (sections.includes("member")) sheets.push(...(await memberSheets()));
  if (sections.includes("keuangan")) sheets.push(...(await financeSheets(from, to)));
  if (sections.includes("lead")) sheets.push(...(await leadSheets(from, to)));
  const wb = XLSX.utils.book_new();
  for (const s of sheets) XLSX.utils.book_append_sheet(wb, toWorksheet(s), s.name);
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
