This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Lead CRM module (`/leads`)

Separate from the coach/member gym tracker: lets ADMIN accounts (Sekar, Esti)
capture WhatsApp leads from ads, run the trial → conversion flow, and follow
up automatically at four points — H+1/H+3 after a trial starts, and H+7/H+21
after someone becomes a member (review ask, then a membership-expiring
heads-up). OWNER accounts see both admins' daily progress, set their
capture/follow-up targets, and can delete a lead (ADMIN can only edit).

- Schema: `Lead`, `FollowUp`, `Target` in `prisma/schema.prisma`. Status is a
  manual funnel stage the admin sets by hand: `DM → TRIAL → MEMBER →
  RETENSI` (DM can also skip straight to MEMBER for a walk-in signup), with
  `LOST` reachable from DM or TRIAL. Trial *booking* itself happens in the
  separate Fitquarter app — this only tracks the status.
- Business logic: `src/lib/leads.ts` (H+1/H+3 from `trialMarkedAt`, H+7/H+21
  from `convertedAt`). WhatsApp pre-filled messages: `src/lib/waScripts.ts`
  (no emoji — confirmed broken through wa.me's `text=` param on both
  WhatsApp Web and iOS). Duplicate-number detection: `Lead.waNumberNormalized`
  in `src/lib/whatsapp.ts`, enforced at the API layer (not a DB unique
  constraint) so a soft-deleted lead's number can be re-captured later.
- Seeded accounts (`prisma/seed-crm.ts` — safe to re-run, only upserts these
  three, never touches COACH/MEMBER data):
  - Admin: `sekar@olympus.gym` / PIN `1010`
  - Admin: `esti@olympus.gym` / PIN `2020`
  - Owner: `owner@olympus.gym` / PIN `9999`

  Anyone can change their own email/PIN from **Akun Saya** once logged in
  (`/leads/account`).
- New admins (e.g. replacing Sekar or Esti after they leave) can self-register
  at `/register-admin` using the shared `ADMIN_INVITE_CODE` env var (see
  `.env`) — give that code only to people who should get admin access to
  lead/customer data. Rotate it (edit `.env` locally and the env var on
  Vercel) if it's ever shared too widely. The code is also shown on the
  owner's Overview page (`/leads/owner`) with a copy button.
- `GOOGLE_REVIEW_LINK` (env var) is included in the H+7 message if set;
  omitted gracefully if not. Both env vars need to be added in Vercel's
  project settings too — `.env` is gitignored and doesn't deploy.

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
