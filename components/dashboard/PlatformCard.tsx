"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PlatformIcon } from "@/components/icons/PlatformIcon";
import { PLATFORMS } from "@/lib/platforms/config";
import type { Platform } from "@/lib/types/database";

interface Account {
  platform_username: string | null;
  platform_avatar: string | null;
}

interface Props {
  platform: Platform;
  account?: Account | null;
}

export function PlatformCard({ platform, account }: Props) {
  const router = useRouter();
  const meta = PLATFORMS[platform];
  const connected = !!account;
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);

  function connect() {
    setBusy(true);
    // Hard navigation to the OAuth init route
    window.location.href = `/api/auth/${platform}`;
  }

  function disconnect() {
    startTransition(async () => {
      const res = await fetch("/api/accounts/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast.error(j.error || "Could not disconnect");
        return;
      }
      toast.success(`${meta.name} disconnected`);
      router.refresh();
    });
  }

  return (
    <Card className="relative overflow-hidden">
      <div
        className="absolute inset-x-0 top-0 h-1"
        style={{ backgroundColor: meta.brandColor }}
      />
      <CardContent className="flex flex-col gap-4 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="grid size-10 place-items-center rounded-lg"
              style={{
                backgroundColor: `${meta.brandColor}15`,
                color: meta.brandColor,
              }}
            >
              <PlatformIcon platform={platform} className="size-5" />
            </div>
            <div>
              <p className="font-semibold">{meta.name}</p>
              <p className="text-xs text-muted-foreground">{meta.blurb}</p>
            </div>
          </div>
          {connected && <CheckCircle2 className="size-5 text-emerald-500" />}
        </div>

        {connected ? (
          <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
            <Avatar className="size-8">
              {account?.platform_avatar && (
                <AvatarImage src={account.platform_avatar} alt={account.platform_username ?? ""} />
              )}
              <AvatarFallback>
                {account?.platform_username?.charAt(0).toUpperCase() ?? "?"}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium truncate">
              {account?.platform_username || "Connected"}
            </span>
          </div>
        ) : (
          <p className="rounded-lg bg-muted/30 p-3 text-xs text-muted-foreground">
            Not connected.
          </p>
        )}

        {connected ? (
          <Button
            variant="outline"
            onClick={disconnect}
            disabled={pending}
            className="w-full"
          >
            {pending ? "Disconnecting…" : "Disconnect"}
          </Button>
        ) : (
          <Button onClick={connect} disabled={busy} className="w-full">
            {busy ? "Redirecting…" : "Connect"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
