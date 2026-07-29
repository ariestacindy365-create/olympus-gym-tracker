This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Lead CRM module (`/leads`)

Separate from the coach/member gym tracker: lets ADMIN accounts (Sekar, Esti)
capture WhatsApp leads from ads, track DM replies (2+ = qualified), run the
trial → conversion flow, and follow up at H+1/H+3. OWNER accounts see both
admins' daily progress and set their capture/follow-up targets.

- Schema: `Lead`, `Trial`, `FollowUp`, `Target` in `prisma/schema.prisma`.
- Business logic: `src/lib/leads.ts` (qualification threshold, H+1/H+3 date
  math, auto follow-up scheduling).
- Seeded accounts (`prisma/seed-crm.ts` — safe to re-run, only upserts these
  three, never touches COACH/MEMBER data):
  - Admin: `sekar@olympus.gym` / PIN `1010`
  - Admin: `esti@olympus.gym` / PIN `2020`
  - Owner: `owner@olympus.gym` / PIN `9999`

  **Change these PINs before real use** — either log in and use a future
  "change PIN" flow, or re-run with different values and upsert by hand.

Schema changes were applied with `npx prisma db push` (this project doesn't
use `prisma migrate`, see `prisma.config.ts`). Do **not** run `prisma/seed.ts`
against the real database — it wipes and reseeds all users, including real
gym members; it's for local demo data only.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
