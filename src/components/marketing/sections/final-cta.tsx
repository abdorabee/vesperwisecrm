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
