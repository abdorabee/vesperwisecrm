"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useOnboardingTour } from "@/components/onboarding-tour-context";
import { completeOnboardingTour } from "@/lib/actions/onboarding-tour";
import { cn } from "@/lib/utils";

interface OnboardingTourProps {
  shouldAutoOpen: boolean;
  isAdmin: boolean;
}

interface TourStep {
  title: string;
  route: string;
  body: string;
  adminOnly?: boolean;
}

const TOUR_STEPS: TourStep[] = [
  {
    title: "Intake",
    route: "/intake",
    body: "Log a new lead manually, or let your intake webhook bring new opportunities into the system automatically.",
  },
  {
    title: "Pipeline & Leads",
    route: "/pipeline",
    body: "Your leads live in the pipeline, where they move from first contact through each stage toward close.",
  },
  {
    title: "Queue",
    route: "/queue",
    body: "Use the queue to focus on prioritized leads that need action today.",
  },
  {
    title: "Sequences",
    route: "/sequences",
    body: "Build scheduled multi-step outreach with calls, texts, and emails that keep follow-up moving.",
  },
  {
    title: "Workflows",
    route: "/workflows",
    body: "Create automation rules that move leads between stages or trigger actions when conditions are met.",
  },
  {
    title: "Scorecard",
    route: "/scorecard",
    body: "Track your own activity and performance metrics so you can see what is working.",
  },
  {
    title: "Team",
    route: "/team",
    body: "Manage teammates, permissions, and visibility across the account.",
    adminOnly: true,
  },
  {
    title: "Settings",
    route: "/settings/profile",
    body: "Manage your profile, email identity, and Google connection from Settings.",
  },
];

export function OnboardingTour({
  shouldAutoOpen,
  isAdmin,
}: OnboardingTourProps) {
  const { open, setOpen, openTour, closeTour } = useOnboardingTour();
  const [stepIndex, setStepIndex] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);
  const completingRef = useRef(false);

  const steps = useMemo(
    () => TOUR_STEPS.filter((step) => isAdmin || !step.adminOnly),
    [isAdmin],
  );
  const currentStep = steps[stepIndex] ?? steps[0];
  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === steps.length - 1;

  useEffect(() => {
    if (shouldAutoOpen) {
      openTour();
    }
  }, [openTour, shouldAutoOpen]);

  async function completeAndClose() {
    if (completingRef.current) {
      return;
    }

    completingRef.current = true;
    setIsCompleting(true);

    try {
      await completeOnboardingTour();
      closeTour();
      setStepIndex(0);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save tour status",
      );
    } finally {
      completingRef.current = false;
      setIsCompleting(false);
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setOpen(true);
      return;
    }

    void completeAndClose();
  }

  function handleNext() {
    if (isLastStep) {
      void completeAndClose();
      return;
    }

    setStepIndex((current) => current + 1);
  }

  if (!currentStep) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between gap-4 pr-8">
            <p className="text-xs font-medium text-muted-foreground">
              Step {stepIndex + 1} of {steps.length}
            </p>
            <div className="flex gap-1" aria-hidden="true">
              {steps.map((step, index) => (
                <span
                  key={step.route}
                  className={cn(
                    "size-1.5 rounded-full bg-muted-foreground/25",
                    index === stepIndex && "bg-foreground",
                  )}
                />
              ))}
            </div>
          </div>
          <DialogTitle className="text-xl">{currentStep.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{currentStep.route}</p>
          <p className="text-pretty text-base leading-7">{currentStep.body}</p>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            disabled={isCompleting}
            onClick={() => void completeAndClose()}
          >
            Skip
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={isFirstStep || isCompleting}
            onClick={() => setStepIndex((current) => current - 1)}
          >
            Back
          </Button>
          <Button type="button" disabled={isCompleting} onClick={handleNext}>
            {isLastStep ? "Finish" : "Next"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
