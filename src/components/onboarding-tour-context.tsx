"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface OnboardingTourContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  openTour: () => void;
  closeTour: () => void;
}

const OnboardingTourContext =
  createContext<OnboardingTourContextValue | null>(null);

export function OnboardingTourProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const openTour = useCallback(() => setOpen(true), []);
  const closeTour = useCallback(() => setOpen(false), []);

  const value = useMemo(
    () => ({ open, setOpen, openTour, closeTour }),
    [closeTour, open, openTour],
  );

  return (
    <OnboardingTourContext.Provider value={value}>
      {children}
    </OnboardingTourContext.Provider>
  );
}

export function useOnboardingTour() {
  const context = useContext(OnboardingTourContext);

  if (!context) {
    throw new Error(
      "useOnboardingTour must be used within OnboardingTourProvider",
    );
  }

  return context;
}
