// Client-safe labels for announcement categories.
export const ANNOUNCEMENT_CATEGORY = {
  PENGUMUMAN: { label: "Pengumuman", emoji: "📢" },
  PROMO: { label: "Promo", emoji: "🎁" },
  ARTIKEL: { label: "Artikel", emoji: "📖" },
  LAINNYA: { label: "Lainnya", emoji: "✨" },
} as const;

export type AnnouncementCategoryKey = keyof typeof ANNOUNCEMENT_CATEGORY;
