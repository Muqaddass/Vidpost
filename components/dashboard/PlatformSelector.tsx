"use client";

import Link from "next/link";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { PlatformIcon } from "@/components/icons/PlatformIcon";
import { PLATFORM_LIST, PLATFORMS } from "@/lib/platforms/config";
import type { Platform } from "@/lib/types/database";

interface Props {
  selected: Platform[];
  onChange: (next: Platform[]) => void;
  connected: Set<Platform>;
  mediaType: "video" | "image" | null;
}

export function PlatformSelector({ selected, onChange, connected, mediaType }: Props) {
  function toggle(p: Platform, checked: boolean) {
    if (checked) onChange(Array.from(new Set([...selected, p])));
    else onChange(selected.filter((x) => x !== p));
  }

  return (
    <div className="space-y-2">
      {PLATFORM_LIST.map((p) => {
        const isConnected = connected.has(p.id);
        const mediaOk =
          mediaType === null ||
          (mediaType === "video" && p.acceptsVideo) ||
          (mediaType === "image" && p.acceptsImage);
        const disabled = !isConnected || !mediaOk;
        const isChecked = selected.includes(p.id);

        return (
          <label
            key={p.id}
            className={`flex items-center gap-3 rounded-lg border p-3 transition ${
              disabled
                ? "cursor-not-allowed opacity-60"
                : "cursor-pointer hover:bg-muted/40"
            } ${isChecked ? "border-primary bg-primary/5" : "border-border"}`}
          >
            <Checkbox
              checked={isChecked}
              disabled={disabled}
              onCheckedChange={(c) => toggle(p.id, !!c)}
            />
            <span style={{ color: p.brandColor }}>
              <PlatformIcon platform={p.id} className="size-5" />
            </span>
            <span className="flex-1">
              <Label className="text-sm font-medium leading-none">{p.name}</Label>
              {!isConnected && (
                <Link
                  href="/dashboard/connect"
                  className="ml-2 text-xs text-primary underline"
                >
                  Connect
                </Link>
              )}
              {isConnected && !mediaOk && (
                <span className="ml-2 text-xs text-muted-foreground">
                  Doesn&apos;t accept {mediaType}
                </span>
              )}
            </span>
          </label>
        );
      })}
      {selected.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Select at least one platform.
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Selected:{" "}
        {selected.length > 0
          ? selected.map((s) => PLATFORMS[s].name).join(", ")
          : "none"}
      </p>
    </div>
  );
}
