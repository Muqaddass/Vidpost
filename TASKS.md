# VidPost — Build Tasks

Master tracker for the VidPost SaaS build. Updated continuously as work progresses.

Legend: `[ ]` pending · `[~]` in progress · `[x]` done · `[!]` blocked

---

## Phase 0 — Project Bootstrap ✅

- [x] Run `create-next-app` (TypeScript + Tailwind + App Router + ESLint + no src dir, alias `@/*`)
- [x] Install runtime deps: `@supabase/supabase-js`, `@supabase/ssr`, `@aws-sdk/client-s3`, `googleapis`, `zod`, `lucide-react`, `sonner`, `react-dropzone`, `date-fns`, `next-themes`, `class-variance-authority`, `clsx`, `tailwind-merge`
- [x] Install `@tailwindcss/typography` for legal-page prose
- [x] Initialize shadcn/ui (radix base, defaults)
- [x] Add shadcn components: button, card, input, label, textarea, tabs, dialog, dropdown-menu, badge, avatar, select, checkbox, sonner, separator, skeleton, table, progress, switch, alert
- [x] Write `.env.example` and `.env.local` template
- [x] Override `globals.css` primary color to brand indigo `#6366f1`

## Phase 1 — Data Layer ✅

- [x] `supabase/migrations/0001_init.sql` — `connected_accounts`, `posts`, `post_results` tables + RLS policies + updated_at trigger
- [x] `lib/types/database.ts` — TS row types
- [x] `lib/supabase/server.ts` — server client (with cookies)
- [x] `lib/supabase/client.ts` — browser client
- [x] `lib/supabase/admin.ts` — service role client (server only)
- [x] `lib/encrypt.ts` — AES-256-GCM encrypt/decrypt
- [x] `lib/r2.ts` — Cloudflare R2 S3-compatible client + upload helper
- [x] `lib/oauth-state.ts` — HttpOnly signed cookie for CSRF protection
- [x] `lib/utils.ts` — `cn()` helper

## Phase 2 — Auth & Middleware ✅

- [x] `middleware.ts` — refresh Supabase session, protect `/dashboard/*`, redirect logged-in users away from auth pages
- [x] `app/(auth)/layout.tsx` — centered auth shell
- [x] `app/(auth)/login/page.tsx` + `LoginForm.tsx` (client) wrapped in Suspense (for `useSearchParams`)
- [x] `app/(auth)/signup/page.tsx` + `SignupForm.tsx`
- [x] `app/auth/callback/route.ts` — Supabase email confirmation redirect

## Phase 3 — Landing & Legal ✅

- [x] `app/page.tsx` — landing composition
- [x] `components/landing/Navbar.tsx`
- [x] `components/landing/Hero.tsx`
- [x] `components/landing/Features.tsx` (5 platform cards)
- [x] `components/landing/HowItWorks.tsx` (3 steps)
- [x] `components/landing/Pricing.tsx` (Free / Pro $9)
- [x] `components/landing/Footer.tsx`
- [x] `app/privacy-policy/page.tsx`
- [x] `app/terms-of-service/page.tsx`

## Phase 4 — Dashboard Shell ✅

- [x] `app/(dashboard)/layout.tsx` — sidebar + bottom mobile nav + header w/ user menu
- [x] `components/dashboard/Sidebar.tsx` — desktop sidebar + `MobileNav` sub-component
- [x] `components/dashboard/UserMenu.tsx` — avatar + sign-out
- [x] `app/(dashboard)/dashboard/page.tsx` — overview, stats, recent posts
- [x] `app/(dashboard)/dashboard/settings/page.tsx` — account info + sign out

## Phase 5 — Connect Platforms UI ✅

- [x] `app/(dashboard)/dashboard/connect/page.tsx`
- [x] `app/(dashboard)/dashboard/connect/ConnectFlash.tsx` — toast for ?connected= / ?error=
- [x] `components/dashboard/PlatformCard.tsx`
- [x] `components/icons/PlatformIcon.tsx` (inline SVGs for all 5)
- [x] `app/api/accounts/disconnect/route.ts`

## Phase 6 — OAuth Routes (per platform) ✅

For each of: tiktok, instagram, youtube, linkedin, pinterest

- [x] `app/api/auth/<platform>/route.ts` — generate state, redirect to provider
- [x] `app/api/auth/<platform>/callback/route.ts` — verify state, exchange code, fetch profile, encrypt + store tokens
- [x] `lib/platforms/<platform>.ts` — auth URL, token exchange, profile fetch, refresh, publish
- [x] `lib/platforms/types.ts` — `PlatformAdapter` interface
- [x] `lib/platforms/config.ts` — platform metadata + brand colors
- [x] `lib/platforms/index.ts` — adapter registry
- [x] `lib/oauth-handlers.ts` — shared `startOAuth` + `handleOAuthCallback`

## Phase 7 — Create Post & Upload ✅

- [x] `app/(dashboard)/dashboard/create/page.tsx`
- [x] `app/(dashboard)/dashboard/create/CreatePostForm.tsx`
- [x] `components/dashboard/UploadArea.tsx` — react-dropzone + XHR progress
- [x] `components/dashboard/PlatformSelector.tsx` — disables platforms that don't accept the media type or aren't connected
- [x] `app/api/post/upload/route.ts` — multipart → R2 → public URL
- [x] `app/api/post/publish/route.ts` — fan-out, write `post_results`

## Phase 8 — Posts History ✅

- [x] `app/(dashboard)/dashboard/posts/page.tsx` — table with status badges + per-platform success indicators

## Phase 9 — Token Refresh + Cron ✅

- [x] `app/api/auth/refresh/route.ts` — finds accounts expiring < 2h, refreshes, updates DB. Authorized via `Bearer $CRON_SECRET`.
- [x] `vercel.json` — hourly cron hitting `/api/auth/refresh`

## Phase 10 — Polish ✅

- [x] README with setup instructions (Supabase, R2, per-platform OAuth registration, env vars, cron)
- [x] `npm run build` passes — TypeScript + page generation succeed for all 25 routes

---

## OAuth App Setup Notes (for the user)

Each platform requires registering a developer app and adding `https://<your-domain>/api/auth/<platform>/callback` as the redirect URI:

- **TikTok**: <https://developers.tiktok.com/> — Login Kit + Content Posting API scopes
- **Instagram**: <https://developers.facebook.com/> — Instagram Graph API with `instagram_business_basic`, `instagram_content_publish`
- **YouTube**: <https://console.cloud.google.com/> — enable YouTube Data API v3, OAuth client, scope `youtube.upload`
- **LinkedIn**: <https://www.linkedin.com/developers/> — request `w_member_social` access
- **Pinterest**: <https://developers.pinterest.com/> — scopes `boards:read,pins:read,pins:write`

## Known decisions / follow-ups

- **Scheduling**: spec mentions `scheduled` status but no scheduler. Wired into schema; UI shows a disabled "Schedule" button. Background worker deferred — v1 is "Post Now" only.
- **Instagram**: requires an Instagram Business account connected to a Facebook Page. Uses Reels media type for videos.
- **TikTok**: posts default to `SELF_ONLY` privacy (developer policy) — creators publish via the TikTok app.
- **YouTube**: defaults to `private` privacy.
- **Supabase typed client**: had to drop `<Database>` generic on the three supabase wrappers because supabase-js v2's `.select()` / `.update()` narrowed to `never` against a hand-rolled `Database` type. Row types are still enforced via explicit casts in callers (see `lib/types/database.ts`). Replace by generating types via `supabase gen types typescript` once the project is provisioned.
- **Next.js version**: spec called for Next 14; create-next-app installed Next 16. App Router APIs unchanged. The build warns that `middleware.ts` is being renamed to `proxy.ts` in a future major.
- **Encryption key rotation**: changing `ENCRYPTION_KEY` after users onboard makes every stored token unreadable. Document a rotation strategy before going to prod.
- **R2 public URL**: assumes a public R2.dev domain or Worker-backed custom domain. The browser never talks to R2 directly — uploads go through `/api/post/upload`.
