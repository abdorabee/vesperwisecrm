"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface RouteErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
}

// Shared body for the route-group error.tsx boundaries: logs the failure,
// shows a recoverable message instead of the raw Next.js overlay.
export function RouteError({
  error,
  reset,
  title = "Something went wrong",
}: RouteErrorProps) {
  useEffect(() => {
    console.error(
      JSON.stringify({
        scope: "route-error-boundary",
        message: error.message,
        digest: error.digest,
      }),
    );
  }, [error]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>
            The page hit an unexpected error. Your data is safe — try again,
            and if it keeps happening let your admin know.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={reset}>Try again</Button>
        </CardContent>
      </Card>
    </div>
  );
}
