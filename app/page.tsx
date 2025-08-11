"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    const supabase = supabaseBrowser();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) router.replace("/chats");
      else router.replace("/login");
    });
  }, [router]);
  return null;
}
