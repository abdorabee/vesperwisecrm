"use client";

import { Button } from "@/components/ui/button";
import { useOnboardingTour } from "@/components/onboarding-tour-context";

export function ReplayTourButton() {
  const { openTour } = useOnboardingTour();

  return (
    <Button type="button" size="sm" className="w-fit" onClick={openTour}>
      Replay tour
    </Button>
  );
}
