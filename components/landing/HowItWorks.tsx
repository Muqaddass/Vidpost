import { Link2, Upload, Zap } from "lucide-react";

const STEPS = [
  {
    icon: Link2,
    title: "Connect",
    body: "Authorize each platform via OAuth in one click. No API keys, no copy-paste.",
  },
  {
    icon: Upload,
    title: "Upload",
    body: "Drop in a video or image, write your caption, choose which platforms get it.",
  },
  {
    icon: Zap,
    title: "Post",
    body: "We fan out to every selected platform and report back what landed where.",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="mx-auto max-w-6xl px-6 py-20">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
          Three steps. One workflow.
        </h2>
        <p className="mt-4 text-muted-foreground">
          From draft to published across five platforms in under a minute.
        </p>
      </div>
      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {STEPS.map((s, i) => (
          <div key={s.title} className="relative rounded-xl border border-border bg-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
                <s.icon className="size-5" />
              </div>
              <span className="text-sm font-mono text-muted-foreground">0{i + 1}</span>
            </div>
            <h3 className="font-semibold">{s.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
