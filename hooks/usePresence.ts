"use client";
import { useEffect } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

export function usePresence() {
  useEffect(() => {
    const supabase = supabaseBrowser();
    let currentUserId: string | null = null;
    supabase.auth.getUser().then(({ data }) => {
      currentUserId = data.user?.id ?? null;
      if (currentUserId) {
        supabase.from("profiles").update({ is_online: true, last_seen: new Date().toISOString() }).eq("id", currentUserId);
      }
    });
    let active = true;
    const setOnline = async () => {
      try {
        await fetch("/api/presence", { method: "POST" });
      } catch {}
    };
    const setOffline = async () => {
      try {
        await fetch("/api/presence", { method: "DELETE" });
      } catch {}
    };
    setOnline();
    const beforeUnload = () => {
      if (currentUserId) {
        // best-effort; non-blocking
        supabase.from("profiles").update({ is_online: false, last_seen: new Date().toISOString() }).eq("id", currentUserId);
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    const vis = () => {
      if (document.visibilityState === "hidden") setOffline();
      else setOnline();
    };
    document.addEventListener("visibilitychange", vis);
    return () => {
      active = false;
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("visibilitychange", vis);
      if (currentUserId) {
        supabase.from("profiles").update({ is_online: false, last_seen: new Date().toISOString() }).eq("id", currentUserId);
      }
    };
  }, []);
}

