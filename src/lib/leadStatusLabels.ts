export const STATUS_LABEL: Record<string, string> = {
  DM: "DM",
  TRIAL: "Trial",
  MEMBER: "Member",
  RETENSI: "Retensi",
  LOST: "Tidak Lanjut",
};

export const STATUS_TONE: Record<string, "default" | "success" | "accent" | "danger" | "muted"> = {
  DM: "muted",
  TRIAL: "accent",
  MEMBER: "success",
  RETENSI: "success",
  LOST: "danger",
};

export const FOLLOWUP_STATUS_LABEL: Record<string, string> = {
  PENDING: "Menunggu",
  DONE: "Selesai",
  MISSED: "Terlewat",
};

// H1/H3 = trial check-ins. H7 = fixed post-conversion check-in + review ask.
// H21 = renewal reminder — despite the name, its due date is no longer a
// fixed 21 days; it's scheduled 7 days before the package's real expiry
// (see scheduleRenewalReminder in lib/leads.ts). CUSTOM = admin-scheduled
// for an arbitrary date.
export const FOLLOWUP_TYPE_LABEL: Record<string, string> = {
  H1: "H+1",
  H3: "H+3",
  H7: "H+7",
  H21: "Reminder Perpanjangan",
  CUSTOM: "Manual",
};

export const FOLLOWUP_TYPE_TONE: Record<string, "default" | "success" | "accent" | "danger" | "muted"> = {
  H1: "accent",
  H3: "danger",
  H7: "success",
  H21: "danger",
  CUSTOM: "muted",
};
