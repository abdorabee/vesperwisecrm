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
