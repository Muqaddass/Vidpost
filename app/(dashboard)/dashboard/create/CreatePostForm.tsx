"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UploadArea, type UploadedMedia } from "@/components/dashboard/UploadArea";
import { PlatformSelector } from "@/components/dashboard/PlatformSelector";
import type { Platform } from "@/lib/types/database";

const MAX_CAPTION = 2200;

export function CreatePostForm({ connectedPlatforms }: { connectedPlatforms: Platform[] }) {
  const router = useRouter();
  const connected = new Set<Platform>(connectedPlatforms);
  const [media, setMedia] = useState<UploadedMedia | null>(null);
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [publishing, setPublishing] = useState(false);

  // When media changes, drop any selected platforms that don't accept it
  function updateMedia(m: UploadedMedia | null) {
    setMedia(m);
    if (m) {
      setPlatforms((prev) =>
        prev.filter((p) => {
          if (m.mediaType === "video") return p !== "pinterest" || true; // all accept video
          return p !== "tiktok" && p !== "youtube"; // image: TikTok/YT don't accept
        }),
      );
    }
  }

  async function publish() {
    if (!media) return toast.error("Upload a file first");
    if (platforms.length === 0) return toast.error("Select at least one platform");
    setPublishing(true);
    try {
      const res = await fetch("/api/post/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title || undefined,
          caption,
          mediaUrl: media.url,
          mediaType: media.mediaType,
          platforms,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Publish failed");

      const failed = j.results.filter((r: { ok: boolean }) => !r.ok);
      if (failed.length === 0) {
        toast.success(`Published to ${j.results.length} platform${j.results.length > 1 ? "s" : ""}`);
      } else {
        toast.warning(
          `${j.results.length - failed.length}/${j.results.length} succeeded. Failed: ${failed
            .map((f: { platform: string; error: string }) => `${f.platform} (${f.error})`)
            .join(", ")}`,
        );
      }
      router.push("/dashboard/posts");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Publish failed");
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        <Card>
          <CardContent className="space-y-5 p-6">
            <div>
              <Label className="mb-2 block">Media</Label>
              <UploadArea value={media} onChange={updateMedia} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Title (optional)</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Used as YouTube/Pinterest title"
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="caption">Caption</Label>
                <span
                  className={`text-xs ${
                    caption.length > MAX_CAPTION
                      ? "text-destructive"
                      : "text-muted-foreground"
                  }`}
                >
                  {caption.length} / {MAX_CAPTION}
                </span>
              </div>
              <Textarea
                id="caption"
                rows={6}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Write your caption…"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardContent className="space-y-4 p-6">
            <div>
              <Label className="mb-3 block">Platforms</Label>
              <PlatformSelector
                selected={platforms}
                onChange={setPlatforms}
                connected={connected}
                mediaType={media?.mediaType ?? null}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 p-6">
            <Button
              className="w-full"
              size="lg"
              onClick={publish}
              disabled={publishing || !media || platforms.length === 0}
            >
              {publishing ? "Publishing…" : "Post now"}
            </Button>
            <Button className="w-full" size="lg" variant="outline" disabled title="Coming soon">
              Schedule
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Posts run sequentially across each selected platform.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
