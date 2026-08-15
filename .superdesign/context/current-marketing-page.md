# Current Marketing Page Source Bundle

This bundle contains the full source of every UI-rendering dependency for the current `/home` page. It exists only to satisfy the Superdesign API's 20-context-file ceiling without thinning the reproduction context.

## `src/app/(marketing)/home/page.tsx`

```tsx
import type { Metadata } from "next";

import { AiSection } from "@/components/marketing/sections/ai-section";
import { DashboardGallery } from "@/components/marketing/sections/dashboard-gallery";
import { FinalCta } from "@/components/marketing/sections/final-cta";
import { Hero } from "@/components/marketing/sections/hero";
import { MetricsStrip } from "@/components/marketing/sections/metrics-strip";
import { PricingPreview } from "@/components/marketing/sections/pricing-preview";
import { ProductShowcase } from "@/components/marketing/sections/product-showcase";
import { Testimonials } from "@/components/marketing/sections/testimonials";
import { WhyVesperwise } from "@/components/marketing/sections/why-vesperwise";
import { WorkflowViz } from "@/components/marketing/sections/workflow-viz";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://vesperwisecrm.vercel.app";

const PAGE_TITLE =
  "VesperWise CRM — Acquisition-Pipeline CRM for Wholesalers & Cold-Calling Teams";
const PAGE_DESCRIPTION =
  "Lead intake, AI qualification, and automated email & SMS follow-up in one place. VesperWise is the acquisition-pipeline CRM that never lets a lead go cold.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: "/home" },
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: "/home",
    siteName: "VesperWise CRM",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
  },
};

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "VesperWise CRM",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description: PAGE_DESCRIPTION,
  url: `${SITE_URL}/home`,
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <Hero />
      <MetricsStrip />
      <ProductShowcase />
      <AiSection />
      <WorkflowViz />
      <DashboardGallery />
      <WhyVesperwise />
      <Testimonials />
      <PricingPreview />
      <FinalCta />
    </>
  );
}
```

## `src/app/(marketing)/layout.tsx`

```tsx
import type { ReactNode } from "react";

import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingNav } from "@/components/marketing/marketing-nav";
import "@/components/marketing/marketing.css";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className="dark flex min-h-screen flex-col bg-background text-foreground"
      data-theme-surface="marketing"
    >
      <MarketingNav />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
    </div>
  );
}
```

## `src/components/marketing/marketing-nav.tsx`

```tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { VesperWiseLogo } from "@/components/vesper-wise-logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { label: "Product", href: "#product" },
  { label: "AI", href: "#ai" },
  { label: "Pricing", href: "#pricing" },
];

const SCROLL_THRESHOLD_PX = 8;

export function MarketingNav() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > SCROLL_THRESHOLD_PX);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-colors duration-200",
        isScrolled
          ? "border-b border-border bg-background/70 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <nav
        className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6"
        aria-label="Main"
      >
        <VesperWiseLogo size="sm" href="/home" />

        <div className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            render={<Link href="/login" />}
            nativeButton={false}
            className="hidden sm:inline-flex"
          >
            Sign in
          </Button>
          <Button render={<Link href="/login" />} nativeButton={false}>
            Get started
          </Button>
        </div>
      </nav>
    </header>
  );
}
```

## `src/components/marketing/marketing-footer.tsx`

```tsx
import Link from "next/link";

import { VesperWiseLogo } from "@/components/vesper-wise-logo";

const FOOTER_LINKS = [
  { label: "Product", href: "#product" },
  { label: "AI", href: "#ai" },
  { label: "Pricing", href: "#pricing" },
  { label: "Sign in", href: "/login" },
];

export function MarketingFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-12 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div className="flex flex-col gap-2">
            <VesperWiseLogo size="sm" href="/home" />
            <p className="max-w-xs text-sm text-muted-foreground">
              The acquisition-pipeline CRM: lead intake, qualification, and
              follow-up from any device.
            </p>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2" aria-label="Footer">
            {FOOTER_LINKS.map((link) =>
              link.href.startsWith("#") ? (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground"
                >
                  {link.label}
                </a>
              ) : (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground"
                >
                  {link.label}
                </Link>
              ),
            )}
          </nav>
        </div>
        <div className="divider-quiet border-t pt-6">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} VesperWise. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
```

## `src/components/vesper-wise-logo.tsx`

```tsx
import Link from "next/link";
import { cn } from "@/lib/utils";

const sizeStyles = {
  sm: {
    word: "text-[13px] sm:text-sm",
    block: "h-7 w-7 sm:h-8 sm:w-8 text-[11px] sm:text-xs px-1",
  },
  md: {
    word: "text-lg sm:text-xl",
    block: "h-10 w-10 sm:h-12 sm:w-12 text-sm sm:text-base px-1.5",
  },
} as const;

interface VesperWiseLogoProps {
  size?: keyof typeof sizeStyles;
  href?: string;
  className?: string;
  iconOnly?: boolean;
}

function Wordmark({
  size = "sm",
  className,
  iconOnly,
}: {
  size?: keyof typeof sizeStyles;
  className?: string;
  iconOnly?: boolean;
}) {
  const styles = sizeStyles[size];

  return (
    <span
      className={cn(
        "inline-flex items-stretch leading-none select-none",
        className,
      )}
      aria-hidden
    >
      {!iconOnly && (
        <span
          className={cn(
            "self-center font-bold uppercase tracking-tight text-foreground",
            styles.word,
          )}
        >
          VESPER
        </span>
      )}
      <span
        className={cn(
          "inline-flex items-center justify-center bg-primary font-bold uppercase tracking-tight text-primary-foreground",
          styles.block,
          styles.word,
        )}
      >
        {iconOnly ? "W" : "WISE."}
      </span>
    </span>
  );
}

export function VesperWiseLogo({
  size = "sm",
  href,
  className,
  iconOnly,
}: VesperWiseLogoProps) {
  if (href) {
    return (
      <Link
        href={href}
        aria-label="Vesper Wise home"
        className={cn(
          "inline-flex min-h-11 shrink-0 items-center py-1 transition-opacity duration-200 hover:opacity-90",
          className,
        )}
      >
        <Wordmark size={size} iconOnly={iconOnly} />
      </Link>
    );
  }

  return (
    <span
      className={cn("inline-flex items-center", className)}
      role="img"
      aria-label="Vesper Wise"
    >
      <Wordmark size={size} iconOnly={iconOnly} />
    </span>
  );
}
```

## `src/components/marketing/section-heading.tsx`

```tsx
import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  eyebrow: string;
  title: string;
  subcopy?: string;
  align?: "center" | "left";
  className?: string;
}

export function SectionHeading({
  eyebrow,
  title,
  subcopy,
  align = "center",
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4",
        align === "center" && "items-center text-center",
        className,
      )}
    >
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-accent-foreground uppercase">
        {eyebrow}
      </p>
      <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
        {title}
      </h2>
      {subcopy ? (
        <p className="max-w-2xl text-base text-muted-foreground sm:text-lg">
          {subcopy}
        </p>
      ) : null}
    </div>
  );
}
```

## `src/components/marketing/logo-marquee.tsx`

```tsx
import { DEMO_WORDMARKS } from "@/components/marketing/mock/mock-data";

/**
 * Scrolling strip of clearly-illustrative team wordmarks.
 * Duplicated list + translateX(-50%) keyframe = seamless loop.
 */
export function LogoMarquee() {
  const entries = [...DEMO_WORDMARKS, ...DEMO_WORDMARKS];

  return (
    <div
      className="overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_15%,black_85%,transparent)]"
      aria-hidden
    >
      <div className="marketing-marquee flex w-max items-center gap-14 py-2">
        {entries.map((name, index) => (
          <span
            key={`${name}-${index}`}
            className="font-mono text-sm font-medium tracking-[0.18em] whitespace-nowrap text-cold uppercase"
          >
            {name}
          </span>
        ))}
      </div>
    </div>
  );
}
```

## `src/components/marketing/sections/ai-section.tsx`

```tsx
import { Brain, PhoneCall, Zap } from "lucide-react";

import { Stagger, StaggerItem } from "@/components/marketing/motion/stagger";
import { SectionHeading } from "@/components/marketing/section-heading";

export function AiSection() {
  return (
    <section id="ai" className="scroll-mt-24 py-24 sm:py-32">
      <div className="mx-auto flex max-w-6xl flex-col gap-14 px-4 sm:px-6">
        <SectionHeading
          eyebrow="AI inside"
          title="AI that scores leads and writes the notes."
          subcopy="VesperWise reads every lead and every call so your team spends its time talking to sellers, not typing."
        />

        <Stagger className="grid gap-4 lg:grid-cols-3">
          <StaggerItem className="flex flex-col gap-5 rounded-xl bg-card p-6 ring-1 ring-foreground/10">
            <span className="flex size-10 items-center justify-center rounded-lg surface-subtle ring-1 ring-foreground/10">
              <Brain className="size-4.5 text-accent-foreground" />
            </span>
            <div className="flex flex-col gap-2">
              <h3 className="font-medium">AI lead scoring</h3>
              <p className="text-sm text-muted-foreground">
                Every lead gets a 0–100 score the moment it arrives, so the
                first call of the day is always the best one.
              </p>
            </div>
            <div className="mt-auto flex flex-wrap gap-2" aria-hidden>
              <span className="rounded-full border border-[color:var(--hot-border)] bg-hot-subtle px-2.5 py-1 text-xs font-medium text-hot tabular-nums">
                92 · Hot
              </span>
              <span className="rounded-full border border-[color:var(--warm-border)] bg-warm-subtle px-2.5 py-1 text-xs font-medium text-warm tabular-nums">
                64 · Warm
              </span>
              <span className="rounded-full border border-[color:var(--cold-border)] bg-cold-subtle px-2.5 py-1 text-xs font-medium text-cold tabular-nums">
                22 · Cold
              </span>
            </div>
          </StaggerItem>

          <StaggerItem className="flex flex-col gap-5 rounded-xl bg-card p-6 ring-1 ring-foreground/10">
            <span className="flex size-10 items-center justify-center rounded-lg surface-subtle ring-1 ring-foreground/10">
              <PhoneCall className="size-4.5 text-accent-foreground" />
            </span>
            <div className="flex flex-col gap-2">
              <h3 className="font-medium">AI call summaries</h3>
              <p className="text-sm text-muted-foreground">
                Call recordings become structured summaries — motivation, price,
                timeline — logged to the lead automatically.
              </p>
            </div>
            <div
              className="mt-auto rounded-lg surface-quiet p-3 font-mono text-[11px] leading-relaxed text-muted-foreground"
              aria-hidden
            >
              <p className="text-foreground/80">Summary · 6 min call</p>
              <p>Seller motivated — relocating in 60 days.</p>
              <p>Asking $85k, flexible on close date.</p>
              <p className="text-hot">Next: send comps by Thursday.</p>
            </div>
          </StaggerItem>

          <StaggerItem className="flex flex-col gap-5 rounded-xl bg-card p-6 ring-1 ring-foreground/10">
            <span className="flex size-10 items-center justify-center rounded-lg surface-subtle ring-1 ring-foreground/10">
              <Zap className="size-4.5 text-accent-foreground" />
            </span>
            <div className="flex flex-col gap-2">
              <h3 className="font-medium">Auto-qualification</h3>
              <p className="text-sm text-muted-foreground">
                Workflows route hot leads to your closers, drop cold ones into
                nurture, and keep the queue clean without a human touch.
              </p>
            </div>
            <div className="mt-auto flex flex-col gap-1.5" aria-hidden>
              <div className="flex items-center gap-2 rounded-lg surface-quiet px-3 py-2 text-xs">
                <span className="size-1.5 rounded-full bg-hot" />
                Score ≥ 80 → assign to closer
              </div>
              <div className="flex items-center gap-2 rounded-lg surface-quiet px-3 py-2 text-xs">
                <span className="size-1.5 rounded-full bg-cold" />
                Score &lt; 40 → nurture sequence
              </div>
            </div>
          </StaggerItem>
        </Stagger>
      </div>
    </section>
  );
}
```

## `src/components/marketing/sections/dashboard-gallery.tsx`

```tsx
"use client";

import { MockBrowserFrame } from "@/components/marketing/mock/mock-browser-frame";
import { MockPipeline } from "@/components/marketing/mock/mock-pipeline";
import { MockScorecard } from "@/components/marketing/mock/mock-scorecard";
import { MockSequence } from "@/components/marketing/mock/mock-sequence";
import { MockTvWall } from "@/components/marketing/mock/mock-tv-wall";
import { SectionHeading } from "@/components/marketing/section-heading";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const GALLERY_TABS = [
  {
    value: "pipeline",
    label: "Pipeline",
    url: "app.vesperwise.com/pipeline",
    content: <MockPipeline />,
  },
  {
    value: "scorecard",
    label: "Scorecard",
    url: "app.vesperwise.com/scorecard",
    content: <MockScorecard />,
  },
  {
    value: "sequences",
    label: "Sequences",
    url: "app.vesperwise.com/sequences",
    content: <MockSequence />,
  },
  {
    value: "tv-wall",
    label: "TV wall",
    url: "vesperwise.com/tv/floor-1",
    content: <MockTvWall />,
  },
];

export function DashboardGallery() {
  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto flex max-w-6xl flex-col gap-14 px-4 sm:px-6">
        <SectionHeading
          eyebrow="Every screen"
          title="Built for the desk, the floor, and the field."
          subcopy="From the closer's pipeline to the TV on the sales floor — the same live numbers everywhere."
        />

        <Tabs defaultValue="pipeline" className="items-center">
          <TabsList>
            {GALLERY_TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {GALLERY_TABS.map((tab) => (
            <TabsContent
              key={tab.value}
              value={tab.value}
              className="w-full max-w-4xl"
            >
              <MockBrowserFrame url={tab.url}>{tab.content}</MockBrowserFrame>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </section>
  );
}
```

## `src/components/marketing/sections/final-cta.tsx`

```tsx
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/marketing/motion/reveal";

export function FinalCta() {
  return (
    <section className="relative overflow-hidden border-t border-border py-24 sm:py-32">
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-80 bg-[radial-gradient(ellipse_at_bottom,rgba(223,255,0,0.05),transparent_60%)]"
        aria-hidden
      />
      <Reveal className="relative mx-auto flex max-w-3xl flex-col items-center gap-6 px-4 text-center sm:px-6">
        <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-5xl">
          Your next deal is already in the queue.
        </h2>
        <p className="max-w-xl text-lg text-muted-foreground">
          Set up VesperWise in minutes. Bring your lead list, plug in your
          forms, and let the follow-up run itself.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button size="lg" render={<Link href="/login" />} nativeButton={false}>
            Get started free
          </Button>
          <Button
            size="lg"
            variant="ghost"
            render={<Link href="/login" />}
            nativeButton={false}
          >
            Sign in
          </Button>
        </div>
      </Reveal>
    </section>
  );
}
```

## `src/components/marketing/sections/hero.tsx`

```tsx
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
```

## `src/components/marketing/sections/metrics-strip.tsx`

```tsx
import { LogoMarquee } from "@/components/marketing/logo-marquee";
import { AnimatedCounter } from "@/components/marketing/motion/counter";
import { Stagger, StaggerItem } from "@/components/marketing/motion/stagger";
import { DEMO_METRICS } from "@/components/marketing/mock/mock-data";

export function MetricsStrip() {
  return (
    <section className="divider-quiet border-y">
      <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 py-16 sm:px-6">
        <Stagger className="grid grid-cols-2 gap-8 lg:grid-cols-4">
          {DEMO_METRICS.map((metric) => (
            <StaggerItem
              key={metric.label}
              className="flex flex-col items-center gap-2 text-center"
            >
              <AnimatedCounter
                value={metric.value}
                prefix={metric.prefix}
                suffix={metric.suffix}
                className="text-3xl font-semibold tabular-nums sm:text-4xl"
              />
              <p className="max-w-44 text-sm text-muted-foreground">
                {metric.label}
              </p>
            </StaggerItem>
          ))}
        </Stagger>

        <div className="flex flex-col gap-5">
          <p className="text-center font-mono text-xs tracking-[0.2em] text-muted-foreground uppercase">
            Built for teams like these
          </p>
          <LogoMarquee />
        </div>
      </div>
    </section>
  );
}
```

## `src/components/marketing/sections/pricing-preview.tsx`

```tsx
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
```

## `src/components/marketing/sections/product-showcase.tsx`

```tsx
import { Check } from "lucide-react";
import type { ReactNode } from "react";

import { MockBrowserFrame } from "@/components/marketing/mock/mock-browser-frame";
import { MockLeadQueue } from "@/components/marketing/mock/mock-lead-queue";
import { MockPipeline } from "@/components/marketing/mock/mock-pipeline";
import { MockSequence } from "@/components/marketing/mock/mock-sequence";
import { Reveal } from "@/components/marketing/motion/reveal";
import { SectionHeading } from "@/components/marketing/section-heading";
import { cn } from "@/lib/utils";

interface ShowcaseBlock {
  eyebrow: string;
  title: string;
  problem: string;
  solution: string;
  bullets: string[];
  mock: ReactNode;
  url: string;
}

const SHOWCASE_BLOCKS: ShowcaseBlock[] = [
  {
    eyebrow: "Lead queue",
    title: "Stop losing deals in the queue.",
    problem:
      "Leads pour in from forms, lists, and cold calls — and the good ones get buried under the rest.",
    solution:
      "Every new lead lands in one queue, scored by AI, so your team always knows which call to make next.",
    bullets: [
      "Intake from forms, API, and list imports",
      "AI scores every lead the moment it arrives",
      "Hot leads surface to the top automatically",
    ],
    mock: <MockLeadQueue />,
    url: "app.vesperwise.com/queue",
  },
  {
    eyebrow: "Pipeline",
    title: "Your pipeline, not a spreadsheet.",
    problem:
      "Deals tracked in spreadsheets go stale, and nobody trusts the numbers by Friday.",
    solution:
      "Drag deals through stages on a live kanban board — values, owners, and match scores always in view.",
    bullets: [
      "Drag-and-drop stages the whole team shares",
      "Deal value and AI match score on every card",
      "Close rate and stage totals update live",
    ],
    mock: <MockPipeline />,
    url: "app.vesperwise.com/pipeline",
  },
  {
    eyebrow: "Sequences",
    title: "Follow-up that runs itself.",
    problem:
      "Most deals die from silence — the third, fourth, and fifth touches nobody has time to send.",
    solution:
      "Email and SMS sequences fire on schedule, pause on replies, and log every touch back to the lead.",
    bullets: [
      "Email + SMS steps with smart timing",
      "Auto-pause the moment a lead replies",
      "Every touch logged to the lead history",
    ],
    mock: <MockSequence />,
    url: "app.vesperwise.com/sequences",
  },
];

export function ProductShowcase() {
  return (
    <section id="product" className="scroll-mt-24 py-24 sm:py-32">
      <div className="mx-auto flex max-w-6xl flex-col gap-20 px-4 sm:px-6">
        <SectionHeading
          eyebrow="The product"
          title="From first touch to closed deal, in one system."
          subcopy="Every screen below is the real product — the same pipeline your team will live in every day."
        />

        {SHOWCASE_BLOCKS.map((block, index) => (
          <Reveal key={block.title}>
            <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
              <div
                className={cn(
                  "flex flex-col gap-4",
                  index % 2 === 1 && "lg:order-2",
                )}
              >
                <p className="font-mono text-xs font-medium tracking-[0.2em] text-accent-foreground uppercase">
                  {block.eyebrow}
                </p>
                <h3 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                  {block.title}
                </h3>
                <p className="text-muted-foreground">{block.problem}</p>
                <p className="text-foreground/90">{block.solution}</p>
                <ul className="mt-2 flex flex-col gap-2.5">
                  {block.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-center gap-2.5 text-sm">
                      <Check className="size-4 shrink-0 text-hot" />
                      {bullet}
                    </li>
                  ))}
                </ul>
              </div>
              <MockBrowserFrame
                url={block.url}
                className={cn(index % 2 === 1 && "lg:order-1")}
              >
                {block.mock}
              </MockBrowserFrame>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
```

## `src/components/marketing/sections/testimonials.tsx`

```tsx
import { Stagger, StaggerItem } from "@/components/marketing/motion/stagger";
import { SectionHeading } from "@/components/marketing/section-heading";
import { DEMO_TESTIMONIALS } from "@/components/marketing/mock/mock-data";

export function Testimonials() {
  return (
    <section className="divider-quiet border-y py-24 sm:py-32">
      <div className="mx-auto flex max-w-6xl flex-col gap-14 px-4 sm:px-6">
        <SectionHeading
          eyebrow="Teams on VesperWise"
          title="What the floor sounds like after the switch."
        />

        <Stagger className="grid gap-4 lg:grid-cols-3">
          {DEMO_TESTIMONIALS.map((testimonial) => (
            <StaggerItem
              key={testimonial.initials}
              className="flex h-full flex-col justify-between gap-6 rounded-xl bg-card p-6 ring-1 ring-foreground/10"
            >
              <blockquote className="text-sm leading-relaxed text-foreground/90">
                &ldquo;{testimonial.quote}&rdquo;
              </blockquote>
              <figcaption className="flex items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs text-muted-foreground">
                  {testimonial.initials}
                </span>
                <div>
                  <p className="text-sm font-medium">{testimonial.persona}</p>
                  <p className="text-xs text-muted-foreground">
                    {testimonial.detail}
                  </p>
                </div>
              </figcaption>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
```

## `src/components/marketing/sections/why-vesperwise.tsx`

```tsx
import { Check, X } from "lucide-react";

import { Reveal } from "@/components/marketing/motion/reveal";
import { SectionHeading } from "@/components/marketing/section-heading";

interface ComparisonRow {
  before: string;
  after: string;
}

const COMPARISON_ROWS: ComparisonRow[] = [
  {
    before: "Leads sit in inboxes and spreadsheets until someone remembers",
    after: "Every lead lands in one queue with a score and a next action",
  },
  {
    before: "Follow-up happens when someone has time — usually never",
    after: "Sequences send the 3rd, 4th, and 5th touch automatically",
  },
  {
    before: "Call notes live in someone's head or a legal pad",
    after: "AI summarizes every call straight onto the lead record",
  },
  {
    before: "Nobody knows the real close rate until month end",
    after: "Live scorecards and a TV wall the whole floor can see",
  },
  {
    before: "New reps take weeks to learn 'the system'",
    after: "One pipeline, one queue, one way of working — from day one",
  },
];

export function WhyVesperwise() {
  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto flex max-w-6xl flex-col gap-14 px-4 sm:px-6">
        <SectionHeading
          eyebrow="Why VesperWise"
          title="Less chasing. More closing."
        />

        <Reveal>
          <div className="grid overflow-hidden rounded-xl ring-1 ring-foreground/10 lg:grid-cols-2">
            <div className="flex flex-col gap-5 surface-quiet p-6 sm:p-8">
              <h3 className="font-mono text-xs font-medium tracking-[0.2em] text-cold uppercase">
                Spreadsheets &amp; sticky notes
              </h3>
              <ul className="flex flex-col gap-4">
                {COMPARISON_ROWS.map((row) => (
                  <li
                    key={row.before}
                    className="flex items-start gap-3 text-sm text-muted-foreground"
                  >
                    <X className="mt-0.5 size-4 shrink-0 text-cold" />
                    {row.before}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col gap-5 bg-card p-6 sm:p-8">
              <h3 className="font-mono text-xs font-medium tracking-[0.2em] text-accent-foreground uppercase">
                VesperWise
              </h3>
              <ul className="flex flex-col gap-4">
                {COMPARISON_ROWS.map((row) => (
                  <li
                    key={row.after}
                    className="flex items-start gap-3 text-sm"
                  >
                    <Check className="mt-0.5 size-4 shrink-0 text-hot" />
                    {row.after}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
```

## `src/components/marketing/sections/workflow-viz.tsx`

```tsx
import {
  BarChart3,
  Handshake,
  Inbox,
  Kanban,
  ScanSearch,
  Send,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Stagger, StaggerItem } from "@/components/marketing/motion/stagger";
import { SectionHeading } from "@/components/marketing/section-heading";

interface WorkflowStep {
  icon: LucideIcon;
  label: string;
  description: string;
}

const WORKFLOW_STEPS: WorkflowStep[] = [
  { icon: Inbox, label: "Capture", description: "Forms, API, imports" },
  { icon: ScanSearch, label: "Qualify", description: "AI scores every lead" },
  { icon: Kanban, label: "Manage", description: "One shared pipeline" },
  { icon: Send, label: "Automate", description: "Email & SMS sequences" },
  { icon: Handshake, label: "Close", description: "Deals under contract" },
  { icon: BarChart3, label: "Analyze", description: "Scorecards & KPI wall" },
];

export function WorkflowViz() {
  return (
    <section className="divider-quiet border-y py-24 sm:py-32">
      <div className="mx-auto flex max-w-6xl flex-col gap-14 px-4 sm:px-6">
        <SectionHeading
          eyebrow="How it works"
          title="One loop, from raw lead to closed deal."
        />

        <div className="relative">
          <svg
            className="absolute top-6 right-[8%] left-[8%] hidden h-px w-[84%] lg:block"
            aria-hidden
            preserveAspectRatio="none"
            viewBox="0 0 100 1"
          >
            <line
              x1="0"
              y1="0.5"
              x2="100"
              y2="0.5"
              stroke="rgba(255,255,255,0.15)"
              strokeWidth="1"
              strokeDasharray="4 4"
              vectorEffect="non-scaling-stroke"
              className="marketing-dash"
            />
          </svg>

          <Stagger className="relative grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-6">
            {WORKFLOW_STEPS.map((step) => (
              <StaggerItem
                key={step.label}
                className="flex flex-col items-center gap-3 text-center"
              >
                <span className="flex size-12 items-center justify-center rounded-xl surface-subtle ring-1 ring-foreground/10">
                  <step.icon className="size-5 text-foreground/80" />
                </span>
                <div>
                  <p className="text-sm font-medium">{step.label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </div>
    </section>
  );
}
```

## `src/components/marketing/mock/mock-browser-frame.tsx`

```tsx
import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/utils";

interface MockBrowserFrameProps {
  children: ReactNode;
  url?: string;
  className?: string;
  style?: CSSProperties;
}

/** Window chrome (traffic dots + URL pill) wrapping any product mockup. */
export function MockBrowserFrame({
  children,
  url = "app.vesperwise.com",
  className,
  style,
}: MockBrowserFrameProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10",
        className,
      )}
      style={style}
      aria-hidden
    >
      <div className="flex items-center gap-3 border-b border-border px-4 py-2.5">
        <div className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-destructive/60" />
          <span className="size-2.5 rounded-full bg-warm/60" />
          <span className="size-2.5 rounded-full bg-hot/60" />
        </div>
        <div className="flex h-6 flex-1 max-w-64 items-center justify-center rounded-md bg-muted px-3 font-mono text-[10px] text-muted-foreground">
          {url}
        </div>
      </div>
      {children}
    </div>
  );
}
```

## `src/components/marketing/mock/mock-dashboard.tsx`

```tsx
import {
  ClipboardCheck,
  FolderKanban,
  Kanban,
  Mail,
  Trophy,
  Workflow,
} from "lucide-react";

import {
  DEMO_DASHBOARD_KPIS,
  DEMO_STAGE_BARS,
} from "@/components/marketing/mock/mock-data";

const SIDEBAR_ICONS = [
  { icon: FolderKanban, isActive: true },
  { icon: Kanban, isActive: false },
  { icon: ClipboardCheck, isActive: false },
  { icon: Mail, isActive: false },
  { icon: Workflow, isActive: false },
  { icon: Trophy, isActive: false },
];

const maxStageCount = Math.max(...DEMO_STAGE_BARS.map((bar) => bar.count));

/** Static replica of the real dashboard: sidebar, KPI grid, stage bar chart. */
export function MockDashboard() {
  return (
    <div className="flex bg-background/60" aria-hidden>
      <div className="flex flex-col items-center gap-1 border-r border-border bg-sidebar px-2 py-3">
        <span className="mb-2 flex size-7 items-center justify-center bg-primary text-[10px] font-bold text-primary-foreground">
          W
        </span>
        {SIDEBAR_ICONS.map(({ icon: Icon, isActive }, index) => (
          <span
            key={index}
            className={
              isActive
                ? "flex size-7 items-center justify-center rounded-md bg-sidebar-accent text-sidebar-foreground"
                : "flex size-7 items-center justify-center rounded-md text-muted-foreground"
            }
          >
            <Icon className="size-3.5" />
          </span>
        ))}
      </div>

      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">Dashboard</span>
          <span className="rounded-md bg-primary px-2.5 py-1 text-[10px] font-medium text-primary-foreground">
            Go to pipeline
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {DEMO_DASHBOARD_KPIS.map((kpi) => (
            <div
              key={kpi.label}
              className="rounded-lg bg-card p-3 ring-1 ring-foreground/10"
            >
              <p className="text-[10px] text-muted-foreground">{kpi.label}</p>
              <p className="mt-1 text-lg font-semibold tabular-nums">
                {kpi.value}
              </p>
            </div>
          ))}
        </div>

        <div className="rounded-lg bg-card p-3 ring-1 ring-foreground/10">
          <p className="text-[10px] font-medium text-muted-foreground">
            Leads by stage
          </p>
          <div className="mt-2.5 flex flex-col gap-2">
            {DEMO_STAGE_BARS.map((bar) => (
              <div key={bar.label} className="flex items-center gap-2">
                <span className="w-20 text-[10px] text-muted-foreground">
                  {bar.label}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-primary"
                    style={{ width: `${(bar.count / maxStageCount) * 100}%` }}
                  />
                </div>
                <span className="w-8 text-right text-[10px] tabular-nums">
                  {bar.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
```

## `src/components/marketing/mock/mock-lead-queue.tsx`

```tsx
import {
  DEMO_QUEUE_LEADS,
  type LeadTemperature,
} from "@/components/marketing/mock/mock-data";
import { cn } from "@/lib/utils";

const TEMPERATURE_STYLES: Record<LeadTemperature, string> = {
  hot: "bg-hot-subtle text-hot border-[color:var(--hot-border)]",
  warm: "bg-warm-subtle text-warm border-[color:var(--warm-border)]",
  cold: "bg-cold-subtle text-cold border-[color:var(--cold-border)]",
};

/** Static lead-queue table with AI score badges. */
export function MockLeadQueue() {
  return (
    <div className="flex flex-col bg-background/60 p-4" aria-hidden>
      <div className="flex items-center justify-between px-2 pb-2">
        <span className="text-[10px] font-medium text-muted-foreground uppercase">
          Lead queue
        </span>
        <span className="text-[10px] text-muted-foreground tabular-nums">
          {DEMO_QUEUE_LEADS.length} waiting
        </span>
      </div>
      <div className="flex flex-col divide-y divide-border rounded-lg bg-card ring-1 ring-foreground/10">
        {DEMO_QUEUE_LEADS.map((lead) => (
          <div
            key={lead.name}
            className="flex items-center justify-between gap-2 px-3 py-2.5"
          >
            <div className="min-w-0">
              <p className="truncate text-[11px] font-medium">{lead.name}</p>
              <p className="text-[10px] text-muted-foreground">{lead.source}</p>
            </div>
            <span
              className={cn(
                "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium tabular-nums",
                TEMPERATURE_STYLES[lead.temperature],
              )}
            >
              AI {lead.score}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## `src/components/marketing/mock/mock-pipeline.tsx`

```tsx
import { DEMO_PIPELINE } from "@/components/marketing/mock/mock-data";

/** Static kanban replica: stage columns with $value cards and % match badges. */
export function MockPipeline() {
  return (
    <div className="flex gap-3 overflow-hidden bg-background/60 p-4" aria-hidden>
      {DEMO_PIPELINE.map((column) => (
        <div key={column.stage} className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-medium text-muted-foreground uppercase">
              {column.stage}
            </span>
            <span className="text-[10px] text-muted-foreground tabular-nums">
              {column.cards.length}
            </span>
          </div>
          {column.cards.map((card) => (
            <div
              key={card.title}
              className="flex flex-col gap-1.5 rounded-lg bg-card p-2.5 ring-1 ring-foreground/10"
            >
              <p className="truncate text-[11px] font-medium">{card.title}</p>
              <p className="text-[11px] text-muted-foreground tabular-nums">
                {card.value}
              </p>
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-primary px-1.5 py-px text-[9px] font-medium text-primary-foreground">
                  {card.match}% match
                </span>
                <span className="flex size-4.5 items-center justify-center rounded-full bg-muted text-[8px] text-muted-foreground">
                  {card.owner}
                </span>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
```

## `src/components/marketing/mock/mock-scorecard.tsx`

```tsx
import { DEMO_SCORECARD } from "@/components/marketing/mock/mock-data";

const maxDials = Math.max(...DEMO_SCORECARD.map((row) => row.dials));

/** Static team leaderboard: initials avatars + the app's h-2 progress-bar pattern. */
export function MockScorecard() {
  return (
    <div className="flex flex-col gap-2.5 bg-background/60 p-4" aria-hidden>
      <div className="flex items-center justify-between px-1">
        <span className="text-[10px] font-medium text-muted-foreground uppercase">
          This week&apos;s dials
        </span>
        <span className="text-[10px] text-muted-foreground">Deals</span>
      </div>
      {DEMO_SCORECARD.map((row, index) => (
        <div
          key={row.initials}
          className="flex items-center gap-3 rounded-lg bg-card px-3 py-2.5 ring-1 ring-foreground/10"
        >
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-[9px] text-muted-foreground">
            {row.initials}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-[11px] font-medium">
                {index === 0 ? `${row.name} 🏆` : row.name}
              </p>
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {row.dials}
              </span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-2 rounded-full bg-primary"
                style={{ width: `${(row.dials / maxDials) * 100}%` }}
              />
            </div>
          </div>
          <span className="shrink-0 text-xs font-semibold tabular-nums">
            {row.deals}
          </span>
        </div>
      ))}
    </div>
  );
}
```

## `src/components/marketing/mock/mock-sequence.tsx`

```tsx
import { Mail, MessageSquare, PhoneCall } from "lucide-react";

import {
  DEMO_SEQUENCE,
  type DemoSequenceStep,
} from "@/components/marketing/mock/mock-data";
import { cn } from "@/lib/utils";

const CHANNEL_ICONS = {
  email: Mail,
  sms: MessageSquare,
  call: PhoneCall,
} as const;

const STATUS_STYLES: Record<DemoSequenceStep["status"], string> = {
  sent: "bg-hot",
  scheduled: "bg-warm",
  waiting: "bg-cold",
};

const STATUS_LABELS: Record<DemoSequenceStep["status"], string> = {
  sent: "Sent",
  scheduled: "Scheduled",
  waiting: "Waiting",
};

/** Static follow-up sequence timeline with channel icons and status dots. */
export function MockSequence() {
  return (
    <div className="flex flex-col gap-1 bg-background/60 p-4" aria-hidden>
      {DEMO_SEQUENCE.map((step, index) => {
        const Icon = CHANNEL_ICONS[step.channel];
        const isLast = index === DEMO_SEQUENCE.length - 1;

        return (
          <div key={step.label} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-card ring-1 ring-foreground/10">
                <Icon className="size-3.5 text-muted-foreground" />
              </span>
              {!isLast && <span className="w-px flex-1 bg-border" />}
            </div>
            <div className="flex flex-1 items-center justify-between gap-2 pt-1 pb-4">
              <div className="min-w-0">
                <p className="truncate text-[11px] font-medium">{step.label}</p>
                <p className="text-[10px] text-muted-foreground">
                  {step.timing}
                </p>
              </div>
              <span className="flex shrink-0 items-center gap-1.5 text-[10px] text-muted-foreground">
                <span
                  className={cn(
                    "size-1.5 rounded-full",
                    STATUS_STYLES[step.status],
                  )}
                />
                {STATUS_LABELS[step.status]}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

## `src/components/marketing/mock/mock-tv-wall.tsx`

```tsx
import {
  DEMO_DASHBOARD_KPIS,
  DEMO_SCORECARD,
} from "@/components/marketing/mock/mock-data";

/** Static TV KPI wall: oversized numbers for the sales-floor screen. */
export function MockTvWall() {
  const [leader, runnerUp] = DEMO_SCORECARD;

  return (
    <div className="flex flex-col gap-3 bg-background/60 p-4" aria-hidden>
      <div className="flex items-center justify-between px-1">
        <span className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
          Vesperwise · KPI wall
        </span>
        <span className="flex items-center gap-1.5 text-[10px] text-hot">
          <span className="size-1.5 rounded-full bg-hot" />
          Live
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {DEMO_DASHBOARD_KPIS.map((kpi) => (
          <div
            key={kpi.label}
            className="flex flex-col items-center gap-1 rounded-lg bg-card p-4 ring-1 ring-foreground/10"
          >
            <p className="text-2xl font-semibold tabular-nums sm:text-3xl">
              {kpi.value}
            </p>
            <p className="text-center text-[9px] text-muted-foreground uppercase">
              {kpi.label}
            </p>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between rounded-lg bg-card px-4 py-3 ring-1 ring-foreground/10">
        <div className="flex items-center gap-2">
          <span className="text-sm">🏆</span>
          <span className="text-[11px] font-medium">{leader.name}</span>
          <span className="text-[10px] text-muted-foreground tabular-nums">
            {leader.dials} dials
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground">
          {runnerUp.name} · {runnerUp.dials} dials
        </span>
      </div>
    </div>
  );
}
```

## `src/components/marketing/mock/mock-data.ts`

```ts
// Illustrative demo content — replace before launch.
// Every name, number, quote, and price on the marketing page lives here so it
// can be swapped for real data in one place.

export type LeadTemperature = "hot" | "warm" | "cold";

export interface DemoQueueLead {
  name: string;
  source: string;
  score: number;
  temperature: LeadTemperature;
}

export const DEMO_QUEUE_LEADS: DemoQueueLead[] = [
  { name: "3412 Larkspur Ave", source: "PPC form", score: 92, temperature: "hot" },
  { name: "Duplex — Cedar Hills", source: "Cold call", score: 81, temperature: "hot" },
  { name: "104 Bellamy Ct", source: "SMS reply", score: 64, temperature: "warm" },
  { name: "Vacant lot — Rte 9", source: "List import", score: 47, temperature: "warm" },
  { name: "88 Winslow Dr", source: "Referral", score: 22, temperature: "cold" },
];

export interface DemoPipelineCard {
  title: string;
  value: string;
  match: number;
  owner: string;
}

export interface DemoPipelineColumn {
  stage: string;
  cards: DemoPipelineCard[];
}

export const DEMO_PIPELINE: DemoPipelineColumn[] = [
  {
    stage: "Qualified",
    cards: [
      { title: "3412 Larkspur Ave", value: "$42,000", match: 92, owner: "MK" },
      { title: "104 Bellamy Ct", value: "$18,500", match: 64, owner: "JR" },
    ],
  },
  {
    stage: "Negotiation",
    cards: [
      { title: "Duplex — Cedar Hills", value: "$61,000", match: 81, owner: "MK" },
      { title: "19 Fontaine St", value: "$27,300", match: 58, owner: "AT" },
    ],
  },
  {
    stage: "Under contract",
    cards: [{ title: "771 Mesa Verde", value: "$54,750", match: 88, owner: "JR" }],
  },
];

export interface DemoSequenceStep {
  channel: "email" | "sms" | "call";
  label: string;
  timing: string;
  status: "sent" | "scheduled" | "waiting";
}

export const DEMO_SEQUENCE: DemoSequenceStep[] = [
  { channel: "email", label: "Intro + cash offer range", timing: "Day 0", status: "sent" },
  { channel: "sms", label: "Quick follow-up text", timing: "Day 1", status: "sent" },
  { channel: "call", label: "Qualification call", timing: "Day 2", status: "sent" },
  { channel: "email", label: "Comps + timeline", timing: "Day 4", status: "scheduled" },
  { channel: "sms", label: "Still interested?", timing: "Day 7", status: "waiting" },
];

export interface DemoKpi {
  label: string;
  value: string;
}

export const DEMO_DASHBOARD_KPIS: DemoKpi[] = [
  { label: "Total leads", value: "1,284" },
  { label: "Created this week", value: "67" },
  { label: "Avg touches/lead", value: "4.2" },
  { label: "Close rate", value: "18%" },
];

export interface DemoBar {
  label: string;
  count: number;
}

export const DEMO_STAGE_BARS: DemoBar[] = [
  { label: "New", count: 342 },
  { label: "Qualified", count: 208 },
  { label: "Negotiation", count: 96 },
  { label: "Contract", count: 41 },
];

export interface DemoScorecardRow {
  initials: string;
  name: string;
  dials: number;
  deals: number;
}

export const DEMO_SCORECARD: DemoScorecardRow[] = [
  { initials: "MK", name: "M. Keller", dials: 148, deals: 6 },
  { initials: "JR", name: "J. Ruiz", dials: 131, deals: 5 },
  { initials: "AT", name: "A. Tran", dials: 117, deals: 4 },
  { initials: "DB", name: "D. Boone", dials: 92, deals: 2 },
];

export const DEMO_WORDMARKS: string[] = [
  "Apex Homebuyers",
  "Northline Dials",
  "Bluecreek Land Co",
  "Summit Acquisitions",
  "Irongate Realty",
  "Cascade Callers",
  "Redrock Offers",
];

export interface DemoMetric {
  value: number;
  prefix?: string;
  suffix?: string;
  label: string;
}

export const DEMO_METRICS: DemoMetric[] = [
  { value: 12000, suffix: "+", label: "Leads worked through the queue" },
  { value: 38000, suffix: "+", label: "Follow-ups sent automatically" },
  { value: 9200, suffix: "+", label: "Calls scored and summarized by AI" },
  { value: 40, suffix: "%", label: "Less time on manual data entry" },
];

export interface DemoTestimonial {
  quote: string;
  initials: string;
  persona: string;
  detail: string;
}

export const DEMO_TESTIMONIALS: DemoTestimonial[] = [
  {
    quote:
      "We used to lose deals because a lead sat untouched for a week. Now every lead has a next action and the sequences run whether we remember or not.",
    initials: "AL",
    persona: "Acquisitions Lead",
    detail: "Land-flipping team, 6 seats",
  },
  {
    quote:
      "The AI call summaries alone pay for it. My closers stopped taking notes and started closing — I read the summary and know exactly where a deal stands.",
    initials: "AO",
    persona: "Agency Owner",
    detail: "Cold-calling agency, 14 seats",
  },
  {
    quote:
      "The TV wall changed the floor. Everyone can see dials, deals, and who's on top — we stopped chasing reports and the numbers went up on their own.",
    initials: "SM",
    persona: "Sales Manager",
    detail: "Wholesaling operation, 9 seats",
  },
];

export interface DemoPricingTier {
  name: string;
  price: string;
  cadence: string;
  description: string;
  features: string[];
  highlighted?: boolean;
}

export const DEMO_PRICING_TIERS: DemoPricingTier[] = [
  {
    name: "Solo",
    price: "$29",
    cadence: "per user / month",
    description: "For a single operator running their own lead flow.",
    features: [
      "Lead intake forms + API",
      "Kanban pipeline",
      "Email sequences",
      "Mobile PWA",
    ],
  },
  {
    name: "Team",
    price: "$79",
    cadence: "per user / month",
    description: "For acquisition teams that live in the queue all day.",
    features: [
      "Everything in Solo",
      "AI lead scoring + call summaries",
      "SMS sequences + workflows",
      "Scorecards + TV KPI wall",
      "Team roles & permissions",
    ],
    highlighted: true,
  },
  {
    name: "Agency",
    price: "Custom",
    cadence: "annual billing",
    description: "For agencies sourcing and working leads for clients.",
    features: [
      "Everything in Team",
      "Client portal + digests",
      "Priority support",
      "Onboarding & migration help",
    ],
  },
];
```

## `src/components/marketing/motion/counter.tsx`

```tsx
"use client";

import { animate, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";

interface AnimatedCounterProps {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
}

const COUNT_DURATION_SECONDS = 1.2;

/** Counts from 0 to `value` when scrolled into view; renders final value under reduced motion. */
export function AnimatedCounter({
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
  className,
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-10% 0px" });
  const shouldReduceMotion = useReducedMotion();

  const format = (current: number) =>
    `${prefix}${current.toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}${suffix}`;

  useEffect(() => {
    const node = ref.current;
    if (!node || !isInView || shouldReduceMotion) return;

    const controls = animate(0, value, {
      duration: COUNT_DURATION_SECONDS,
      ease: "easeOut",
      onUpdate: (current) => {
        node.textContent = `${prefix}${current.toLocaleString("en-US", {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        })}${suffix}`;
      },
    });

    return () => controls.stop();
  }, [isInView, shouldReduceMotion, value, prefix, suffix, decimals]);

  return (
    <span ref={ref} className={className}>
      {shouldReduceMotion ? format(value) : format(0)}
    </span>
  );
}
```

## `src/components/marketing/motion/parallax.tsx`

```tsx
"use client";

import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";
import { useEffect, useSyncExternalStore, type ReactNode } from "react";

interface MouseParallaxProps {
  children: ReactNode;
  /** Max translation in px at the viewport edges. */
  strength?: number;
  className?: string;
}

const SPRING = { stiffness: 120, damping: 20, mass: 0.4 };

const FINE_POINTER_QUERY = "(pointer: fine)";

function subscribeToPointerQuery(onChange: () => void) {
  const mediaQuery = window.matchMedia(FINE_POINTER_QUERY);
  mediaQuery.addEventListener("change", onChange);
  return () => mediaQuery.removeEventListener("change", onChange);
}

function getIsFinePointer() {
  return window.matchMedia(FINE_POINTER_QUERY).matches;
}

/**
 * Gently translates children opposite to the viewport pointer position.
 * Inactive on coarse pointers (touch) and under reduced motion.
 */
export function MouseParallax({
  children,
  strength = 8,
  className,
}: MouseParallaxProps) {
  const shouldReduceMotion = useReducedMotion();
  const isFinePointer = useSyncExternalStore(
    subscribeToPointerQuery,
    getIsFinePointer,
    () => false,
  );

  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const springX = useSpring(pointerX, SPRING);
  const springY = useSpring(pointerY, SPRING);
  const x = useTransform(springX, [-1, 1], [strength, -strength]);
  const y = useTransform(springY, [-1, 1], [strength, -strength]);

  const isActive = isFinePointer && !shouldReduceMotion;

  useEffect(() => {
    if (!isActive) return;

    const handlePointerMove = (event: globalThis.PointerEvent) => {
      pointerX.set((event.clientX / window.innerWidth) * 2 - 1);
      pointerY.set((event.clientY / window.innerHeight) * 2 - 1);
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    return () => window.removeEventListener("pointermove", handlePointerMove);
  }, [isActive, pointerX, pointerY]);

  if (!isActive) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div className={className} style={{ x, y }}>
      {children}
    </motion.div>
  );
}
```

## `src/components/marketing/motion/reveal.tsx`

```tsx
"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

interface RevealProps {
  children: ReactNode;
  delay?: number;
  className?: string;
}

/** Fades and slides content up once it enters the viewport. */
export function Reveal({ children, delay = 0, className }: RevealProps) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10% 0px" }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
```

## `src/components/marketing/motion/stagger.tsx`

```tsx
"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

const STAGGER_STEP_SECONDS = 0.08;

const groupVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: STAGGER_STEP_SECONDS },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" as const },
  },
};

interface StaggerProps {
  children: ReactNode;
  className?: string;
}

/** Orchestrates staggered reveal of its <StaggerItem> children on viewport entry. */
export function Stagger({ children, className }: StaggerProps) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      variants={groupVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-10% 0px" }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: StaggerProps) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div className={className} variants={itemVariants}>
      {children}
    </motion.div>
  );
}
```

## `src/components/ui/button.tsx`

```tsx
import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/80",
        outline:
          "border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        link: "text-brand-strong underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        icon: "size-8",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
```

## `src/components/ui/tabs.tsx`

```tsx
"use client"

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: TabsPrimitive.Root.Props) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn(
        "group/tabs flex gap-2 data-horizontal:flex-col",
        className
      )}
      {...props}
    />
  )
}

const tabsListVariants = cva(
  "group/tabs-list inline-flex w-fit items-center justify-center rounded-lg p-[3px] text-muted-foreground group-data-horizontal/tabs:h-8 group-data-vertical/tabs:h-fit group-data-vertical/tabs:flex-col data-[variant=line]:rounded-none",
  {
    variants: {
      variant: {
        default: "bg-muted",
        line: "gap-1 bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function TabsList({
  className,
  variant = "default",
  ...props
}: TabsPrimitive.List.Props & VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  )
}

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-1.5 py-0.5 text-sm font-medium whitespace-nowrap text-foreground/60 transition-all group-data-vertical/tabs:w-full group-data-vertical/tabs:justify-start hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 has-data-[icon=inline-end]:pr-1 has-data-[icon=inline-start]:pl-1 aria-disabled:pointer-events-none aria-disabled:opacity-50 dark:text-muted-foreground dark:hover:text-foreground group-data-[variant=default]/tabs-list:data-active:shadow-sm group-data-[variant=line]/tabs-list:data-active:shadow-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        "group-data-[variant=line]/tabs-list:bg-transparent group-data-[variant=line]/tabs-list:data-active:bg-transparent dark:group-data-[variant=line]/tabs-list:data-active:border-transparent dark:group-data-[variant=line]/tabs-list:data-active:bg-transparent",
        "data-active:bg-background data-active:text-foreground dark:data-active:border-input dark:data-active:bg-input/30 dark:data-active:text-foreground",
        "after:absolute after:bg-foreground after:opacity-0 after:transition-opacity group-data-horizontal/tabs:after:inset-x-0 group-data-horizontal/tabs:after:bottom-[-5px] group-data-horizontal/tabs:after:h-0.5 group-data-vertical/tabs:after:inset-y-0 group-data-vertical/tabs:after:-right-1 group-data-vertical/tabs:after:w-0.5 group-data-[variant=line]/tabs-list:data-active:after:opacity-100",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn("flex-1 text-sm outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
```

## `src/lib/utils.ts`

```ts
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```
