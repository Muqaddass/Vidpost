import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PlatformIcon } from "@/components/icons/PlatformIcon";
import { PLATFORM_LIST } from "@/lib/platforms/config";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(60%_60%_at_50%_0%,rgba(99,102,241,0.15),transparent)]" />
      <div className="mx-auto max-w-6xl px-6 py-24 text-center md:py-32">
        <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-1.5 text-sm text-muted-foreground">
          <span className="size-2 animate-pulse rounded-full bg-emerald-500" />
          5 platforms · 1 dashboard
        </div>
        <h1 className="mx-auto max-w-3xl text-balance text-4xl font-bold tracking-tight md:text-6xl">
          Post to <span className="text-primary">every platform</span> with one click.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Connect TikTok, Instagram, YouTube, LinkedIn, and Pinterest. Upload once, publish everywhere.
          No API keys, no headaches.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Button size="lg" asChild>
            <Link href="/signup">Start posting free</Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <a href="#how">See how it works</a>
          </Button>
        </div>

        <div className="mt-16 flex flex-wrap items-center justify-center gap-8 opacity-80">
          {PLATFORM_LIST.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-2 text-sm font-medium"
              style={{ color: p.brandColor }}
            >
              <PlatformIcon platform={p.id} className="size-6" />
              {p.name}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
