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
