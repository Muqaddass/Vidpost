import { Suspense } from "react";
import { redirect } from "next/navigation";
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
