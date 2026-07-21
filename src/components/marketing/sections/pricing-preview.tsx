import Link from "next/link";
import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Stagger, StaggerItem } from "@/components/marketing/motion/stagger";
import { SectionHeading } from "@/components/marketing/section-heading";
import { DEMO_PRICING_TIERS } from "@/components/marketing/mock/mock-data";
import { cn } from "@/lib/utils";

export function PricingPreview() {
  return (
    <section id="pricing" className="scroll-mt-24 py-24 sm:py-32">
      <div className="mx-auto flex max-w-6xl flex-col gap-14 px-4 sm:px-6">
        <SectionHeading
          eyebrow="Pricing"
          title="Simple pricing that scales with your team."
          subcopy="Start free, upgrade when the pipeline fills up. Every plan includes the mobile app."
        />

        <Stagger className="grid gap-4 lg:grid-cols-3">
          {DEMO_PRICING_TIERS.map((tier) => (
            <StaggerItem
              key={tier.name}
              className={cn(
                "relative flex h-full flex-col gap-6 rounded-xl bg-card p-6 ring-1 transition-transform duration-200 hover:-translate-y-1 sm:p-8",
                tier.highlighted ? "ring-primary/40" : "ring-foreground/10",
              )}
            >
              {tier.highlighted && (
                <span className="absolute -top-2.5 left-6 rounded-full bg-primary px-2.5 py-0.5 text-xs font-medium text-primary-foreground">
                  Most popular
                </span>
              )}
              <div className="flex flex-col gap-1.5">
                <h3 className="font-medium">{tier.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {tier.description}
                </p>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-semibold tracking-tight tabular-nums">
                  {tier.price}
                </span>
                <span className="text-xs text-muted-foreground">
                  {tier.cadence}
                </span>
              </div>
              <ul className="flex flex-1 flex-col gap-2.5">
                {tier.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-center gap-2.5 text-sm text-foreground/90"
                  >
                    <Check className="size-4 shrink-0 text-hot" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button
                variant={tier.highlighted ? "default" : "outline"}
                render={<Link href="/login" />}
                nativeButton={false}
                className="w-full"
              >
                {tier.price === "Custom" ? "Talk to us" : "Get started"}
              </Button>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
