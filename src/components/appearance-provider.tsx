"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { ThemeProvider, useTheme } from "next-themes";
import {
  APPEARANCE_STORAGE_KEY,
  getRouteThemeColor,
  type Appearance,
} from "@/lib/appearance";

function AppearanceChrome() {
  const pathname = usePathname();
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const appearance: Appearance = resolvedTheme === "dark" ? "dark" : "light";
    const color = getRouteThemeColor(pathname, appearance);
    document
      .querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')
      .forEach((meta) => meta.setAttribute("content", color));
  }, [pathname, resolvedTheme]);

  return null;
}

export function AppearanceProvider({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      storageKey={APPEARANCE_STORAGE_KEY}
      disableTransitionOnChange
    >
      <AppearanceChrome />
      {children}
    </ThemeProvider>
  );
}
