# VidPost

Post to TikTok, Instagram, YouTube, LinkedIn, and Pinterest from one dashboard.

Built with Next.js 16 (App Router), TypeScript, Tailwind v4, shadcn/ui, Supabase (Auth + Postgres), and Cloudflare R2.

## Quick start

```bash
npm install
cp .env.example .env.local   # fill in the values below
npm run dev
```

Open <http://localhost:3000>.

## Environment variables

See [`.env.example`](./.env.example). All of these must be set for the app to be useful, but the app boots without them — features fail per-platform at the point of use.

**Required for the app to run:**

| Var | Description |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server-only) |
| `ENCRYPTION_KEY` | 32 bytes hex — see *Tokens* below |
| `NEXTAUTH_SECRET` | Random string used to sign OAuth state cookies |
| `NEXT_PUBLIC_APP_URL` | Public URL of your deployment |

**Per-platform OAuth credentials:** see the *OAuth app setup* section.

**Cloudflare R2 (for media uploads):** `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`.

**Cron:** `CRON_SECRET` — token used by Vercel cron to authenticate hourly token refreshes.

### Generate the encryption key

```bash
openssl rand -hex 32
```

Paste the output as `ENCRYPTION_KEY`. This is used by [`lib/encrypt.ts`](./lib/encrypt.ts) to AES-256-GCM the stored OAuth tokens. **If you change it after onboarding users, every stored token becomes unreadable** — plan a key rotation accordingly.

## Database setup

1. Create a Supabase project.
2. In the SQL editor, run the migration:

   ```sql
   -- paste contents of supabase/migrations/0001_init.sql
   ```

Tables created: `connected_accounts`, `posts`, `post_results`. Row Level Security is enabled — users can only see and mutate their own rows.

## Cloudflare R2 setup

1. Create a bucket called `vidpost-uploads` (or whatever you set `R2_BUCKET_NAME` to).
2. Create an API token with read+write on the bucket.
3. Enable a public R2.dev URL or attach a custom domain via a Worker; set `R2_PUBLIC_URL` to the base URL (e.g. `https://pub-xxxxxxxxxxxxxxx.r2.dev` or `https://media.vidpost.app`).
4. CORS isn't required because uploads go through the Next.js API route (`/api/post/upload`) — the browser never talks to R2 directly.

## OAuth app setup

For each platform, register a developer app and add this exact redirect URI:

```
https://<your-domain>/api/auth/<platform>/callback
```

| Platform | Console | Required scopes |
| --- | --- | --- |
| TikTok | <https://developers.tiktok.com/> | `user.info.basic`, `video.upload`, `video.publish` |
| Instagram (Meta) | <https://developers.facebook.com/> | `instagram_business_basic`, `instagram_content_publish` |
| YouTube | <https://console.cloud.google.com/> (enable YouTube Data API v3) | `youtube.upload`, `youtube.readonly` |
| LinkedIn | <https://www.linkedin.com/developers/> | `openid profile email w_member_social` |
| Pinterest | <https://developers.pinterest.com/> | `boards:read pins:read pins:write` |

For local development, your redirect URIs will be `http://localhost:3000/api/auth/<platform>/callback`. Most platforms require HTTPS — use a tunnel (e.g. `ngrok`) and set `NEXT_PUBLIC_APP_URL` to the tunnel URL.

## Cron

Token refresh runs hourly via Vercel cron — configured in [`vercel.json`](./vercel.json). Set `CRON_SECRET` in Vercel project settings. The endpoint requires `Authorization: Bearer <CRON_SECRET>`.

To trigger manually:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://<your-domain>/api/auth/refresh
```

## File layout

```
app/
  (auth)/login            ── login page
  (auth)/signup           ── signup page
  (dashboard)/dashboard   ── overview
  (dashboard)/dashboard/connect      ── connect platforms
  (dashboard)/dashboard/create       ── upload + publish
  (dashboard)/dashboard/posts        ── history
  (dashboard)/dashboard/settings     ── account
  api/auth/<platform>                ── OAuth init
  api/auth/<platform>/callback       ── OAuth callback
  api/auth/refresh                   ── token refresh (cron)
  api/post/upload                    ── R2 upload
  api/post/publish                   ── fan-out publish
  api/accounts/disconnect            ── remove account
  privacy-policy, terms-of-service   ── legal pages
  page.tsx                           ── landing
components/
  landing/        ── Hero, Features, HowItWorks, Pricing, Footer, Navbar
  dashboard/      ── Sidebar, PlatformCard, UploadArea, PlatformSelector, UserMenu
  icons/          ── PlatformIcon (inline SVGs)
  ui/             ── shadcn/ui primitives
lib/
  encrypt.ts          ── AES-256-GCM
  oauth-state.ts      ── HttpOnly signed cookie for CSRF protection
  oauth-handlers.ts   ── shared OAuth init + callback flow
  r2.ts               ── Cloudflare R2 client
  utils.ts            ── cn() helper
  supabase/           ── client, server, admin
  platforms/          ── per-platform adapters: tiktok, instagram, youtube, linkedin, pinterest
  types/database.ts   ── DB row types
supabase/
  migrations/0001_init.sql    ── schema + RLS
middleware.ts                 ── refresh Supabase session, guard /dashboard
vercel.json                   ── hourly token refresh cron
TASKS.md                      ── live progress tracker
```

## Limits & known gaps

- Video size limit: 500 MB (enforced in [`/api/post/upload`](./app/api/post/upload/route.ts)).
- Supported formats: MP4, MOV (video); JPG, PNG (image).
- Scheduling is in the schema (`status='scheduled'`, `scheduled_at`) but no worker yet. "Post now" only in v1.
- TikTok posts default to `SELF_ONLY` privacy — creators promote in the TikTok app per developer policy.
- YouTube uploads default to `private`.
- Instagram requires an Instagram Business account connected to a Facebook Page.

See [`TASKS.md`](./TASKS.md) for the master tracker and follow-ups.
