"use client";

import { RouteError } from "@/components/route-error";

export default function DialerError({ error, reset }: { error: Error; reset: () => void }) {
  return <RouteError title="The dialer could not load" error={error} reset={reset} />;
}
