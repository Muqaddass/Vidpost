import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const TIERS = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    cta: "Get started",
    features: [
      "1 account per platform",
      "Post videos & images",
      "Connect all 5 platforms",
      "Posts history",
    ],
    highlight: false,
  },
  {
    name: "Pro",
    price: "$9",
    period: "per month",
    cta: "Upgrade to Pro",
    features: [
      "Unlimited accounts per platform",
      "Scheduling (coming soon)",
      "Team workspaces",
      "Priority support",
    ],
    highlight: true,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="bg-muted/30 border-t border-border/40">
      <div className="mx-auto max-w-5xl px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Simple, honest pricing
          </h2>
          <p className="mt-4 text-muted-foreground">
            Start free. Upgrade when you outgrow it.
          </p>
        </div>
        <div className="mx-auto mt-12 grid max-w-3xl gap-6 md:grid-cols-2">
          {TIERS.map((t) => (
            <div
              key={t.name}
              className={`relative rounded-2xl border bg-card p-8 ${
                t.highlight ? "border-primary shadow-xl" : "border-border"
              }`}
            >
              {t.highlight && (
                <span className="absolute -top-3 left-8 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground">
                  Recommended
                </span>
              )}
              <h3 className="text-xl font-semibold">{t.name}</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold">{t.price}</span>
                <span className="text-muted-foreground">/ {t.period}</span>
              </div>
              <Button className="mt-6 w-full" variant={t.highlight ? "default" : "outline"} asChild>
                <Link href="/signup">{t.cta}</Link>
              </Button>
              <ul className="mt-8 space-y-3 text-sm">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
