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
