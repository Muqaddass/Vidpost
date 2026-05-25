import { PlatformIcon } from "@/components/icons/PlatformIcon";
import { PLATFORM_LIST } from "@/lib/platforms/config";

export function Features() {
  return (
    <section id="features" className="border-y border-border/40 bg-muted/30">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Every platform you actually use
          </h2>
          <p className="mt-4 text-muted-foreground">
            Native OAuth for every platform. Your followers don&apos;t care which tool
            you use — they just want fresh content.
          </p>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {PLATFORM_LIST.map((p) => (
            <div
              key={p.id}
              className="group rounded-xl border border-border bg-card p-6 transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div
                className="mb-4 grid size-12 place-items-center rounded-lg"
                style={{ backgroundColor: `${p.brandColor}15`, color: p.brandColor }}
              >
                <PlatformIcon platform={p.id} className="size-6" />
              </div>
              <h3 className="font-semibold">{p.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{p.blurb}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
