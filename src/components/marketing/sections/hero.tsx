import Link from "next/link";

import { Button } from "@/components/ui/button";
import { MockBrowserFrame } from "@/components/marketing/mock/mock-browser-frame";
import { MockDashboard } from "@/components/marketing/mock/mock-dashboard";
import { MouseParallax } from "@/components/marketing/motion/parallax";
import { Reveal } from "@/components/marketing/motion/reveal";

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-32 pb-24 sm:pt-40 sm:pb-32">
      <div
        className="marketing-grid-bg pointer-events-none absolute inset-0"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[32rem] bg-[radial-gradient(ellipse_at_top,rgba(223,255,0,0.06),transparent_60%)]"
        aria-hidden
      />

      <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-8 px-4 sm:px-6">
        <Reveal className="flex flex-col items-center gap-6 text-center">
          <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
            The acquisition pipeline that never lets a lead go cold.
          </h1>
          <p className="max-w-2xl text-lg text-muted-foreground text-balance">
            VesperWise is the CRM for wholesalers, flippers, and cold-calling
            teams — lead intake, AI qualification, and automated email &amp; SMS
            follow-up in one place.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              size="lg"
              render={<Link href="/login" />}
              nativeButton={false}
            >
              Get started free
            </Button>
            <Button
              size="lg"
              variant="outline"
              render={<a href="#product" />}
              nativeButton={false}
            >
              See how it works
            </Button>
          </div>
        </Reveal>

        <Reveal delay={0.15} className="relative mt-6 w-full max-w-4xl">
          <MockBrowserFrame
            className="[transform:perspective(1200px)_rotateX(4deg)]"
            style={{ boxShadow: "var(--glow-cyan)" }}
          >
            <MockDashboard />
          </MockBrowserFrame>

          <MouseParallax
            strength={10}
            className="absolute -left-10 top-16 hidden md:block"
          >
            <div className="marketing-float flex items-center gap-2.5 rounded-xl bg-card px-3.5 py-2.5 ring-1 ring-foreground/10">
              <span className="size-2 rounded-full bg-hot" />
              <div>
                <p className="text-xs font-medium">AI score 92</p>
                <p className="text-[10px] text-muted-foreground">
                  Hot — call first
                </p>
              </div>
            </div>
          </MouseParallax>

          <MouseParallax
            strength={14}
            className="absolute -right-8 bottom-12 hidden md:block"
          >
            <div className="marketing-float-delayed flex items-center gap-2.5 rounded-xl bg-card px-3.5 py-2.5 ring-1 ring-foreground/10">
              <span className="size-2 rounded-full bg-warm" />
              <div>
                <p className="text-xs font-medium">Sequence step 3/7</p>
                <p className="text-[10px] text-muted-foreground">
                  SMS sent · reply detected
                </p>
              </div>
            </div>
          </MouseParallax>
        </Reveal>
      </div>
    </section>
  );
}
