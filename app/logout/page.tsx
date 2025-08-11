"use client";
import { useEffect } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function Logout() {
  useEffect(() => {
    const run = async () => {
      try {
        const supabase = supabaseBrowser();
        await supabase.auth.signOut();
      } finally {
        window.location.href = "/login";
      }
    };
    run();
  }, []);
  return null;
}

