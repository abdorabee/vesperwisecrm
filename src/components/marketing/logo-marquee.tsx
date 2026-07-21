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
