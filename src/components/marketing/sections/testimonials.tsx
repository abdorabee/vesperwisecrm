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
