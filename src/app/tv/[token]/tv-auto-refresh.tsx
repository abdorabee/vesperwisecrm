"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function TvAutoRefresh({
  intervalSeconds,
}: {
  intervalSeconds: number;
}) {
  const router = useRouter();

  useEffect(() => {
    const timer = setInterval(() => {
      router.refresh();
    }, intervalSeconds * 1000);
    return () => clearInterval(timer);
  }, [router, intervalSeconds]);

  return null;
}
