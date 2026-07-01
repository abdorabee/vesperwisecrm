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
}

function Wordmark({
  size = "sm",
  className,
}: {
  size?: keyof typeof sizeStyles;
  className?: string;
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
      <span
        className={cn(
          "self-center font-bold uppercase tracking-tight text-foreground",
          styles.word,
        )}
      >
        VESPER
      </span>
      <span
        className={cn(
          "inline-flex items-center justify-center bg-primary font-bold uppercase tracking-tight text-primary-foreground",
          styles.block,
          styles.word,
        )}
      >
        WISE.
      </span>
    </span>
  );
}

export function VesperWiseLogo({
  size = "sm",
  href,
  className,
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
        <Wordmark size={size} />
      </Link>
    );
  }

  return (
    <span
      className={cn("inline-flex items-center", className)}
      role="img"
      aria-label="Vesper Wise"
    >
      <Wordmark size={size} />
    </span>
  );
}
