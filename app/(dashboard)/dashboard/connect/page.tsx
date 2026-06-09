import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Info } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PlatformCard } from "@/components/dashboard/PlatformCard";
import { ConnectFlash } from "./ConnectFlash";
import { PLATFORM_LIST } from "@/lib/platforms/config";
import type { Platform } from "@/lib/types/database";

export const metadata = { title: "Connect accounts · VidPost" };
export const dynamic = "force-dynamic";

export default async function ConnectPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: accountsRaw } = await supabase
    .from("connected_accounts")
    .select("platform, platform_username, platform_avatar")
    .eq("user_id", user.id);

  const accounts = (accountsRaw ?? []) as Array<{
    platform: Platform;
    platform_username: string | null;
    platform_avatar: string | null;
  }>;

  const accountByPlatform: Partial<
    Record<Platform, { platform_username: string | null; platform_avatar: string | null }>
  > = {};
  for (const a of accounts) {
    accountByPlatform[a.platform] = {
      platform_username: a.platform_username,
      platform_avatar: a.platform_avatar,
    };
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <Suspense fallback={null}>
        <ConnectFlash />
      </Suspense>
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Connect your accounts</h1>
        <p className="text-muted-foreground">
          Click Connect on each platform you want to post to. You&apos;ll be redirected to that
          platform to authorize VidPost.
        </p>
      </div>

      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm dark:border-blue-900/50 dark:bg-blue-950/30">
        <div className="flex gap-3">
          <Info className="mt-0.5 size-5 shrink-0 text-blue-600 dark:text-blue-400" />
          <div className="space-y-2 text-blue-900 dark:text-blue-100">
            <p className="font-medium">Tips for connecting</p>
            <ul className="ml-5 list-disc space-y-1 text-blue-800/90 dark:text-blue-200/90">
              <li>
                <strong>On mobile:</strong> if the Connect button opens the social app instead of an
                authorization page, long-press the button and choose &quot;Open in browser&quot;.
                Desktop is the most reliable.
              </li>
              <li>
                <strong>TikTok:</strong> in some regions you may need a VPN to access TikTok&apos;s login page.
              </li>
              <li>
                <strong>Facebook:</strong> we post to Facebook <em>Pages</em> you manage — not personal profiles
                (Meta API restriction).
              </li>
              <li>
                <strong>Switching accounts?</strong> Click Disconnect first, then Connect again — the platform
                will show a login screen to pick a different account.
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PLATFORM_LIST.map((p) => (
          <PlatformCard
            key={p.id}
            platform={p.id}
            account={accountByPlatform[p.id] ?? null}
          />
        ))}
      </div>
    </div>
  );
}
