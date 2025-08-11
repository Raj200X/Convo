"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

export function useTyping(conversationId: string | null, userId: string | null) {
  const supabase = useMemo(supabaseBrowser, []);
  const [typingUserIds, setTypingUserIds] = useState<Set<string>>(new Set());
  const timeoutsRef = useRef<Record<string, any>>({});

  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase.channel(`typing:${conversationId}`);
    channel
      .on("broadcast", { event: "typing" }, (payload) => {
        const fromId = payload.payload.userId as string;
        if (!fromId || fromId === userId) return;
        setTypingUserIds((prev) => new Set(prev).add(fromId));
        if (timeoutsRef.current[fromId]) clearTimeout(timeoutsRef.current[fromId]);
        timeoutsRef.current[fromId] = setTimeout(() => {
          setTypingUserIds((prev) => {
            const next = new Set(prev);
            next.delete(fromId);
            return next;
          });
        }, 2000);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
      Object.values(timeoutsRef.current).forEach(clearTimeout);
      timeoutsRef.current = {};
      setTypingUserIds(new Set());
    };
  }, [supabase, conversationId, userId]);

  const sendTyping = () => {
    if (!conversationId || !userId) return;
    supabase.channel(`typing:${conversationId}`).send({ type: "broadcast", event: "typing", payload: { userId } });
  };

  return { typingUserIds, sendTyping };
}

