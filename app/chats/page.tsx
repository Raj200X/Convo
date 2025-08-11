"use client";
import ChatsShell from "@/components/chats/shell";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function ChatsPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const supabase = supabaseBrowser();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.replace("/login");
      else setReady(true);
    });
  }, [router]);
  if (!ready) return null;
  return <ChatsShell />;
}

