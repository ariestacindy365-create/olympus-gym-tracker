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
