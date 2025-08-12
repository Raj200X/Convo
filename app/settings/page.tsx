 "use client";
 export const dynamic = "force-dynamic";
import { useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

export default function SettingsPage() {
  const supabaseRef = useRef<ReturnType<typeof supabaseBrowser> | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabaseRef.current = supabaseBrowser();
    const supabase = supabaseRef.current;
    (async () => {
      const { data: { user } } = await supabase!.auth.getUser();
      if (!user) return;
      const { data } = await supabase!.from("profiles").select("display_name, status_message, avatar_url").eq("id", user.id).single();
      if (data) {
        setDisplayName(data.display_name || "");
        setStatusMessage(data.status_message || "");
        setAvatarUrl(data.avatar_url || null);
      }
    })();
  }, []);

  async function onSave() {
    setLoading(true);
    try {
      const supabase = supabaseRef.current!;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("profiles").upsert({ id: user.id, display_name: displayName, status_message: statusMessage, avatar_url: avatarUrl });
    } finally {
      setLoading(false);
    }
  }

  async function onAvatarChange(file: File) {
    if (file.size > 10 * 1024 * 1024) return alert("Max 10MB");
    const supabase = supabaseRef.current!;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const path = `${user.id}/avatar-${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: false });
    if (error) return alert(error.message);
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    setAvatarUrl(data.publicUrl);
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Profile</h1>
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarImage src={avatarUrl || undefined} alt="Avatar" />
          <AvatarFallback>U</AvatarFallback>
        </Avatar>
        <label className="text-sm underline cursor-pointer">
          Change avatar
          <input type="file" className="hidden" onChange={(e) => e.target.files && onAvatarChange(e.target.files[0])} />
        </label>
      </div>
      <div className="space-y-2">
        <label className="text-sm">Display name</label>
        <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
      </div>
      <div className="space-y-2">
        <label className="text-sm">Status</label>
        <Input value={statusMessage} onChange={(e) => setStatusMessage(e.target.value)} />
      </div>
      <Button onClick={onSave} disabled={loading}>{loading ? "Saving..." : "Save"}</Button>
    </div>
  );
}

