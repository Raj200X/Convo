"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";

export default function DashboardPage() {
  return (
    <SidebarProvider>
      <div className="min-h-[100svh] w-full flex">
        <AppSidebar />
        <main className="flex-1 flex flex-col bg-white/70 dark:bg-black/40 backdrop-blur">
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4">
                          <h1 className="text-4xl font-bold bg-gradient-to-r from-[var(--brand)] to-[var(--brand-600)] bg-clip-text text-transparent">
              Welcome to Campus Chat
            </h1>
              <p className="text-xl text-neutral-600 dark:text-neutral-400 max-w-md">
                Your new professional sidebar is ready! Navigate through People, Groups, and Profile sections.
              </p>
              <div className="flex items-center justify-center gap-4 text-sm text-neutral-500">
                <span>• Collapsible sidebar</span>
                <span>• Professional design</span>
                <span>• LPU branding</span>
              </div>
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
