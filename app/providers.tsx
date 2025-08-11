"use client";

import { ThemeProvider } from "next-themes";
import { ReactNode, useEffect } from "react";
import ThemeToggle from "@/components/ui/theme-toggle";

export default function Providers({ children }: { children: ReactNode }) {
  // Smooth theming transitions
  useEffect(() => {
    document.documentElement.classList.add("theme-ready");
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
    </ThemeProvider>
  );
}

