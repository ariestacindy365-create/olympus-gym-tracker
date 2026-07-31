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

// H1/H3 = trial check-ins, H7/H21 = post-conversion check-ins (review ask
// + membership-expiring reminder). See lib/leads.ts for the scheduling.
export const FOLLOWUP_TYPE_LABEL: Record<string, string> = {
  H1: "H+1",
  H3: "H+3",
  H7: "H+7",
  H21: "H+3 Minggu",
};

export const FOLLOWUP_TYPE_TONE: Record<string, "default" | "success" | "accent" | "danger" | "muted"> = {
  H1: "accent",
  H3: "danger",
  H7: "success",
  H21: "danger",
};
