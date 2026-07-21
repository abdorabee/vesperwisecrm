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
