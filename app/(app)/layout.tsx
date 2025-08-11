export const dynamic = "force-dynamic";
import Providers from "@/app/providers";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_APP_NAME || "Campus Chat",
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <section>
      <Providers>{children}</Providers>
    </section>
  );
}

