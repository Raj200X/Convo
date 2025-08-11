"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import Image from "next/image";
import { Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import TextareaAutosize from "react-textarea-autosize";
import { format, isSameDay } from "date-fns";
import {
  Paperclip,
  Send,
  Plus,
  Users2,
  Search,
  File as FileIcon,
  MessageSquare,
  Users,
  ShoppingBag,
  MailQuestion,
  Archive,
  Phone,
  Video,
  MoreVertical,
  Smile,
  Mic,
  Image as ImageIcon,
  Settings,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import TypingIndicator from "@/components/chats/typing-indicator";
import { useTyping } from "@/hooks/useTyping";

type Message = {
  id: string;
  sender_id: string;
  conversation_id: string;
  content: string | null;
  file_url: string | null;
  file_name: string | null;
  file_size_bytes: number | null;
  created_at: string;
};

type Conversation = {
  id: string;
  type: "direct" | "group";
  group_id: string | null;
};

export default function ChatsShell() {
  const [userId, setUserId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [people, setPeople] = useState<Array<{ id: string; email: string; display_name: string | null; avatar_url: string | null }>>([]);
  const [searching, setSearching] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { typingUserIds, sendTyping } = useTyping(activeConversationId, userId);
  const [showDetails, setShowDetails] = useState(false);

  // Resolve user id and load user's conversations
  useEffect(() => {
    let sub: ReturnType<ReturnType<typeof supabaseBrowser>['channel']> | null = null;
    (async () => {
      const supabase = supabaseBrowser();
      const { data: userData } = await supabase.auth.getUser();
      setUserId(userData.user?.id ?? null);
      if (userData.user) {
        // ensure profile exists for search
        await supabase.from("profiles").upsert({ id: userData.user.id, email: userData.user.email });
      }
      const { data } = await supabase
        .from("conversation_participants")
        .select("conversation_id, conversations(id, type, group_id)");
      type ParticipantRow = { conversation_id: string; conversations: Conversation };
      const convs = (data as ParticipantRow[] | null)?.map((row) => row.conversations) ?? [];
      setConversations(convs);
      if (convs.length && !activeConversationId) setActiveConversationId(convs[0].id);

      // realtime on messages
      sub = supabase
        .channel(`messages`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
          const newMsg = payload.new as Message;
          if (newMsg.conversation_id === activeConversationId) {
            setMessages((m) => [...m, newMsg]);
          }
        })
        .subscribe();
    })();
    return () => {
      if (sub) supabaseBrowser().removeChannel(sub);
    };
  }, [activeConversationId]);

  // Load messages for active conversation
  useEffect(() => {
    if (!activeConversationId) return;
    (async () => {
      const supabase = supabaseBrowser();
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", activeConversationId)
        .order("created_at", { ascending: true });
      setMessages((data as Message[]) || []);
    })();
  }, [activeConversationId]);

  const filteredConversations = useMemo(() => conversations, [conversations]);

  async function sendMessage() {
    const content = draft.trim();
    if (!activeConversationId || content.length === 0) return;
    setDraft("");
    await supabaseBrowser().from("messages").insert({ conversation_id: activeConversationId, content });
  }

  // Search people by email/display_name
  useEffect(() => {
    if (!search || search.trim().length < 2) {
      setPeople([]);
      return;
    }
    const handler = setTimeout(async () => {
      setSearching(true);
      try {
        const supabase = supabaseBrowser();
        const { data, error } = await supabase
          .from("profiles")
          .select("id, email, display_name, avatar_url")
          .or(`email.ilike.%${search}%,display_name.ilike.%${search}%`)
          .limit(10);
        if (error) throw error;
        const current = userId;
        setPeople((data || []).filter((p) => p.id !== current) as any);
      } catch (e) {
        console.error(e);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(handler);
  }, [search, userId]);

  async function openDirectWith(user: { id: string }) {
    if (!userId) return;
    const supabase = supabaseBrowser();
    // find any existing direct conversation between both users
    try {
      const { data: myConvos } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", userId);
      const ids = (myConvos || []).map((r: any) => r.conversation_id);
      if (ids.length) {
        const { data: overlap } = await supabase
          .from("conversation_participants")
          .select("conversation_id, conversations(type)")
          .eq("user_id", user.id)
          .in("conversation_id", ids)
          .eq("conversations.type", "direct");
        const found = (overlap || [])[0];
        if (found) {
          setActiveConversationId(found.conversation_id);
          setPeople([]);
          setSearch("");
          return;
        }
      }
      // create a new direct conversation
      const { data: convIns, error: convErr } = await supabase
        .from("conversations")
        .insert({ type: "direct", created_by: userId })
        .select("id")
        .single();
      if (convErr) throw convErr;
      const convId = convIns.id as string;
      const { error: partErr } = await supabase.from("conversation_participants").insert([
        { conversation_id: convId, user_id: userId, role: "member" },
        { conversation_id: convId, user_id: user.id, role: "member" },
      ]);
      if (partErr) throw partErr;
      setConversations((prev) => [{ id: convId, type: "direct", group_id: null }, ...prev]);
      setActiveConversationId(convId);
      setPeople([]);
      setSearch("");
    } catch (e) {
      console.error(e);
      alert("Failed to start chat");
    }
  }

  async function handleFileUpload(file: File) {
    if (file.size > 10 * 1024 * 1024) {
      alert("Max 10 MB");
      return;
    }
    setUploading(true);
    try {
      const supabase = supabaseBrowser();
      const bucket = "attachments";
      const path = `${userId ?? "anon"}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, {
        upsert: false,
      });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
      await supabase
        .from("messages")
        .insert({ conversation_id: activeConversationId, kind: file.type.startsWith("image") ? "image" : "file", file_url: urlData.publicUrl, file_name: file.name, file_size_bytes: file.size });
    } catch (e) {
      console.error(e);
    } finally {
      setUploading(false);
    }
  }

  // Desktop: 4 columns (nav / list / chat / details)
  // Mobile: single column, we can expand with conditionals later
  const gridCols = showDetails
    ? "md:grid-cols-[200px_320px_minmax(0,1fr)_360px]"
    : "md:grid-cols-[200px_320px_minmax(0,1fr)]";
  return (
    <div className={cn("min-h-[100svh] w-full grid grid-cols-1 bg-[linear-gradient(180deg,rgba(17,24,39,0.02),transparent)]", gridCols)}>
      {/* Left icon rail */}
      <div className="hidden md:flex flex-col justify-between py-4 border-r border-neutral-200 dark:border-neutral-800 bg-white/70 dark:bg-black/40 backdrop-blur">
        <div className="px-3">
          <div className="flex items-center gap-3 px-2">
            <Image src="/lpu-logo.png" alt="LPU" width={40} height={40} className="h-10 w-10 rounded-full object-cover" />
            <div className="font-semibold tracking-tight">Campus</div>
          </div>
          <div className="mt-6 space-y-1">
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-900" aria-label="People">
              <Users size={18} />
              <span className="text-sm">People</span>
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-900" aria-label="Groups">
              <Users2 size={18} />
              <span className="text-sm">Groups</span>
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-900" aria-label="Profile">
              <MessageSquare size={18} />
              <span className="text-sm">Profile</span>
            </button>
          </div>
        </div>
        <div className="px-3 space-y-1">
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-900" aria-label="Settings">
            <Settings size={18} />
            <span className="text-sm">Settings</span>
          </button>
          <a href="/logout" className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-900" aria-label="Logout">
            <LogOut size={18} />
            <span className="text-sm">Logout</span>
          </a>
        </div>
      </div>

      {/* Chat list column */}
      <aside className="hidden md:flex flex-col border-r border-neutral-200 dark:border-neutral-800 bg-white/60 dark:bg-black/30 backdrop-blur p-3">
        <div className="flex items-center gap-2 relative">
          <Input placeholder="Search people by email or name..." value={search} onChange={(e) => setSearch(e.target.value)} className="rounded-xl" />
          <Button variant="outline" className="px-3 rounded-xl"><Search size={18} /></Button>
          {people.length > 0 && (
            <div className="absolute left-0 right-0 top-11 z-20 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-lg overflow-hidden">
              {people.map((p) => (
                <button key={p.id} onClick={() => openDirectWith(p)} className="w-full flex items-center gap-3 px-3 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-900">
                  <Avatar src={p.avatar_url} alt={p.display_name || p.email} />
                  <div className="text-left">
                    <div className="text-sm font-medium">{p.display_name || p.email.split("@")[0]}</div>
                    <div className="text-xs text-neutral-500">{p.email}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 mt-3">
          <Button variant="outline" className="rounded-xl"><MessageSquare className="mr-2" size={16} /> Chat New</Button>
          <Button variant="outline" className="rounded-xl"><Plus className="mr-2" size={16} /> New Group</Button>
        </div>
        <div className="mt-3 text-sm font-semibold px-2">Chats</div>
        <div className="flex-1 overflow-y-auto mt-2 space-y-1 pr-1">
          {filteredConversations.map((c) => (
            <button
              key={c.id}
              onClick={() => { setActiveConversationId(c.id); setShowDetails(false); }}
              className={cn(
                "w-full flex items-center gap-3 rounded-2xl px-3 py-3 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition",
                activeConversationId === c.id && "bg-neutral-100 dark:bg-neutral-900"
              )}
            >
              <Avatar alt={c.type === "group" ? "Group" : "Chat"} />
              <div className="min-w-0 flex-1 text-left">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-medium truncate">{c.type === "group" ? "Group" : "Direct"}</div>
                  <div className="text-[11px] text-neutral-500">1m</div>
                </div>
                <div className="text-xs text-neutral-500 truncate">No recent messages</div>
              </div>
              <div className="h-6 w-6 grid place-items-center rounded-full bg-neutral-200 text-[10px]">…</div>
            </button>
          ))}
        </div>
      </aside>

      {/* Chat area */}
      <main className="flex flex-col h-full bg-white/70 dark:bg-black/40 backdrop-blur">
        {activeConversationId ? (
          <>
            {/* Chat header */}
            <div className="border-b border-neutral-200 dark:border-neutral-800 px-4 py-3 flex items-center gap-3">
              <Avatar alt="Chat" />
              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setShowDetails(true)} title="View profile">
                <div className="font-medium truncate">Conversation</div>
                <div className="text-xs text-neutral-500">Online</div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" className="rounded-xl h-8 px-3"><Phone size={16} /></Button>
                <Button variant="outline" className="rounded-xl h-8 px-3"><Video size={16} /></Button>
                <Button variant="outline" className="rounded-xl h-8 px-3"><MoreVertical size={16} /></Button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-6 space-y-2">
              {messages.map((m, idx) => {
                const prev = messages[idx - 1];
                const showDay = !prev || !isSameDay(new Date(prev.created_at), new Date(m.created_at));
                return (
                  <div key={m.id}>
                    {showDay && (
                      <div className="my-5 text-center text-xs text-neutral-500">{isSameDay(new Date(), new Date(m.created_at)) ? "Today" : "Yesterday"}</div>
                    )}
                    <div className={cn("max-w-[72%] rounded-2xl px-3 py-2 shadow-sm", m.sender_id === userId ? "ml-auto bg-[var(--brand)] text-white" : "bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800")}> 
                      {m.file_url ? (
                        m.file_name && !m.file_url.match(/\.(png|jpe?g|gif|webp)$/i) ? (
                          <a href={m.file_url} target="_blank" className="flex items-center gap-2 underline">
                            <FileIcon size={16} /> {m.file_name}
                          </a>
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={m.file_url} alt={m.file_name ?? "image"} className="rounded-md max-h-60" />
                        )
                      ) : null}
                      {m.content && <div className="whitespace-pre-wrap break-words leading-relaxed">{m.content}</div>}
                      <div className={cn("mt-1 text-[10px] opacity-70", m.sender_id === userId ? "text-white/80" : "text-neutral-500")}>{format(new Date(m.created_at), "p")}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Composer */}
            <div className="border-t border-neutral-200 dark:border-neutral-800 p-2">
              <div className="flex items-end gap-2">
                <button className="p-2 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-900" onClick={() => fileInputRef.current?.click()} aria-label="Attach">
                  <Paperclip size={18} />
                </button>
                <button className="p-2 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-900" aria-label="Emoji"><Smile size={18} /></button>
                <button className="p-2 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-900" aria-label="Image"><ImageIcon size={18} /></button>
                <button className="p-2 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-900" aria-label="Mic"><Mic size={18} /></button>
                <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => e.target.files && handleFileUpload(e.target.files[0])} />
                <TextareaAutosize
                  value={draft}
                  onChange={(e) => {
                    setDraft(e.target.value);
                    sendTyping();
                  }}
                  minRows={1}
                  maxRows={6}
                  className="w-full resize-none rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 px-3 py-2 text-sm outline-none"
                  placeholder="Write something.."
                />
                <Button onClick={sendMessage} disabled={!draft.trim() || uploading} className="h-10 px-4 rounded-2xl">
                  <Send size={16} />
                </Button>
              </div>
              <TypingIndicator visible={typingUserIds.size > 0} />
            </div>
          </>
        ) : (
          <div className="flex-1 grid place-items-center text-neutral-500">Select a conversation</div>
        )}
      </main>

      {/* Details panel (toggle) */}
      {showDetails && (
        <aside className="hidden xl:block border-l border-neutral-200 dark:border-neutral-800 bg-white/60 dark:bg-black/30 backdrop-blur p-4">
          <div className="flex items-center gap-3">
            <Avatar alt="Profile" />
            <div>
              <div className="font-medium">Ricky Smith</div>
              <div className="text-xs text-green-600">Online</div>
            </div>
            <button className="ml-auto text-sm text-neutral-500 hover:underline" onClick={() => setShowDetails(false)}>Close</button>
          </div>
          <div className="mt-6 text-sm font-semibold">Customize Chat</div>
          <div className="mt-4 text-sm font-semibold">Media, Files and Links</div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-lg bg-neutral-200 dark:bg-neutral-800" />
            ))}
          </div>
          <div className="mt-6 text-sm font-semibold">Privacy and Support</div>
        </aside>
      )}
    </div>
  );
}

