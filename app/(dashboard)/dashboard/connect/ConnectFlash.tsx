"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { PLATFORMS } from "@/lib/platforms/config";

// Reads `?connected=<platform>` or `?error=...` from the OAuth callback
// and surfaces it as a toast, then strips the params from the URL.
export function ConnectFlash() {
  const params = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const connected = params.get("connected");
    const error = params.get("error");
    if (connected) {
      const name = (PLATFORMS as Record<string, { name: string }>)[connected]?.name ?? connected;
      toast.success(`${name} connected`);
    }
    if (error) {
      toast.error(decodeURIComponent(error));
    }
    if (connected || error) {
      router.replace("/dashboard/connect");
    }
  }, [params, router]);

  return null;
}
