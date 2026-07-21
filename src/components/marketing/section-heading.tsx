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
