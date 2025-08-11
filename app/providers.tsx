"use client";

import { ThemeProvider } from "next-themes";
import { ReactNode, useEffect } from "react";

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

