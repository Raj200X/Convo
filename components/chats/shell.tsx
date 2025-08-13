"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
// Removed next/image; not used
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
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
  Phone,
  Video,
  MoreVertical,
  Smile,
  Mic,
  Image as ImageIcon,
  Settings,
      LogOut,
      Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
// import Link from "next/link";
import TypingIndicator from "@/components/chats/typing-indicator";
import { useTyping } from "@/hooks/useTyping";
import ThemeToggle from "@/components/ui/theme-toggle";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AnimatePresence, motion } from "framer-motion";
  import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
  } from "@/components/ui/dropdown-menu";
// removed resizable

type Message = {
  id: string;
  sender_id: string;
  conversation_id: string;
  content: string | null;
  file_url: string | null;
  file_name: string | null;
  file_size_bytes: number | null;
  created_at: string;
  isNew?: boolean; // For animation tracking
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
  const [uploading, setUploading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [reactions, setReactions] = useState<Record<string, Record<string, string[]>>>({});
  const QUICK_EMOJIS = ["👍","❤️","😂","😮","😢","🙌"];
  const [headerTitle, setHeaderTitle] = useState<string>("Conversation");
  const [selfProfile, setSelfProfile] = useState<{ display_name: string | null; avatar_url: string | null } | null>(null);
  const [peerProfile, setPeerProfile] = useState<{ display_name: string | null; email: string | null; avatar_url: string | null } | null>(null);

  function toggleReaction(messageId: string, emoji: string) {
    if (!userId) return;
    setReactions(prev => {
      const next: Record<string, Record<string, string[]>> = { ...prev };
      const msgMap = { ...(next[messageId] || {}) };
      const arr = [...(msgMap[emoji] || [])];
      const idx = arr.indexOf(userId);
      if (idx >= 0) arr.splice(idx, 1); else arr.push(userId);
      msgMap[emoji] = arr;
      next[messageId] = msgMap;
      return next;
    });
    setMenuOpenId(null);
  }
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { typingUserIds, sendTyping } = useTyping(activeConversationId, userId);
  const [showDetails, setShowDetails] = useState(false);
  const supabase = useMemo(() => supabaseBrowser(), []);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // pick up active conversation from localStorage (set by sidebar)
  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('activeConversationId') : null;
    if (stored) setActiveConversationId(stored);
    function onStorage(e: StorageEvent) {
      if (e.key === 'activeConversationId' && e.newValue) setActiveConversationId(e.newValue);
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Resolve user id and load user's conversations
  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      setUserId(userData.user?.id ?? null);
      if (userData.user) {
        // ensure profile exists for search
        await supabase.from("profiles").upsert({ id: userData.user.id, email: userData.user.email });
        const { data: me } = await supabase
          .from('profiles')
          .select('display_name, avatar_url')
          .eq('id', userData.user.id)
          .single();
        if (me) setSelfProfile({ display_name: (me as any).display_name ?? null, avatar_url: (me as any).avatar_url ?? null });
      }
      const { data } = await supabase
        .from("conversation_participants")
        .select("conversation_id, conversations(id, type, group_id)");
      type ParticipantRow = { conversation_id: string; conversations: Conversation };
      const convs = (data as ParticipantRow[] | null)?.map((row) => row.conversations) ?? [];
      
      // Remove duplicates based on ID
      const uniqueConvs = convs.filter((conv, index, self) => 
        index === self.findIndex(c => c.id === conv.id)
      );
      
      console.log("Loaded conversations:", uniqueConvs);
      setConversations(uniqueConvs);
      if (uniqueConvs.length && !activeConversationId) setActiveConversationId(uniqueConvs[0].id);
    })();
  }, [activeConversationId, supabase]);

  // Load messages for active conversation
  useEffect(() => {
    if (!activeConversationId) return;
    (async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", activeConversationId)
        .order("created_at", { ascending: true });
      if (data) {
        // Remove duplicates and mark existing messages as not new
        const uniqueMessages = data.filter((msg, index, self) => 
          index === self.findIndex(m => m.id === msg.id)
        ).map(msg => ({ ...msg, isNew: false }));
        setMessages(uniqueMessages);
      }
      // Also compute header title (other user's email for direct chats)
      const { data: conv } = await supabase.from('conversations').select('id,type').eq('id', activeConversationId).single();
      if (conv?.type === 'direct') {
        const { data: participants } = await supabase
          .from('conversation_participants')
          .select('user_id, profiles:profiles(email, display_name, avatar_url)')
          .eq('conversation_id', activeConversationId);
        const other = (participants || []).find((p: any) => p.user_id !== userId) as any;
        const title = other?.profiles?.display_name || other?.profiles?.email || 'Direct chat';
        setPeerProfile({
          display_name: other?.profiles?.display_name ?? null,
          email: other?.profiles?.email ?? null,
          avatar_url: other?.profiles?.avatar_url ?? null,
        });
        setHeaderTitle(title);
      } else {
        setHeaderTitle('Group');
        setPeerProfile(null);
      }
    })();
    // ensure we subscribe to this conversation's inserts/deletes specifically
    const channel = supabase
      .channel(`conversation:${activeConversationId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${activeConversationId}` }, (payload) => {
        const row = payload.new as Message;
        setMessages(prev => (prev.some(m => m.id === row.id) ? prev : [...prev, { ...row, isNew: true }]));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "messages", filter: `conversation_id=eq.${activeConversationId}` }, (payload) => {
        const row = payload.old as Message;
        setMessages(prev => prev.filter(m => m.id !== row.id));
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeConversationId, supabase]);

  const filteredConversations = useMemo(() => conversations, [conversations]);

  async function sendMessage() {
    const content = draft.trim();
    if (!activeConversationId || content.length === 0) return;
    
    setSendingMessage(true);
    setIsTyping(true);
    
    // Create optimistic message for immediate UI feedback
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      sender_id: userId!,
      conversation_id: activeConversationId,
      content,
      file_url: null,
      file_name: null,
      file_size_bytes: null,
      created_at: new Date().toISOString(),
      isNew: true
    };
    
    setMessages(prev => [...prev, optimisticMessage]);
    // Smooth scroll and slight float animation cue
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    });
    setDraft("");
    
    try {
      const { data: inserted, error } = await supabase
        .from("messages")
        .insert({ 
          conversation_id: activeConversationId, 
          content,
          sender_id: userId,
        })
        .select("*")
        .single();
      
      if (error) throw error;
      
      // Replace optimistic message with the inserted row immediately
      setMessages(prev => prev.map(msg =>
        msg.id === optimisticMessage.id ? ({ ...(inserted as Message), isNew: false }) : msg
      ));
    } catch (error) {
      console.error("Failed to send message:", error);
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
      // Could show error toast here
    } finally {
      setSendingMessage(false);
      setIsTyping(false);
    }
  }

  // Search people by email/display_name
  useEffect(() => {
    if (!search || search.trim().length < 2) {
      setPeople([]);
      return;
    }
    const handler = setTimeout(async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, email, display_name, avatar_url")
          .or(`email.ilike.%${search}%,display_name.ilike.%${search}%`)
          .limit(10);
        if (error) throw error;
        const current = userId;
        type Person = { id: string; email: string; display_name: string | null; avatar_url: string | null };
        setPeople(((data || []) as Person[]).filter((p) => p.id !== current));
      } catch (e) {
        console.error(e);
      }
    }, 300);
    return () => clearTimeout(handler);
  }, [search, userId, supabase]);

  async function openDirectWith(user: { id: string }) {
    if (!userId) return;
    
    // Debug: Check authentication state
    const { data: { user: authUser } } = await supabase.auth.getUser();
    console.log("Current auth user:", authUser);
    console.log("Component userId:", userId);
    
    try {
      // find any existing direct conversation between both users
      const { data: myConvos } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", userId);
      type IdRow = { conversation_id: string };
      const ids = ((myConvos || []) as IdRow[]).map((r) => r.conversation_id);
      if (ids.length) {
        // Step 1: find overlapping conversations with the other user
        const { data: overlap } = await supabase
          .from("conversation_participants")
          .select("conversation_id")
          .eq("user_id", user.id)
          .in("conversation_id", ids);
        type Overlap = { conversation_id: string };
        const overlapIds = ((overlap || []) as Overlap[]).map((o) => o.conversation_id);
        // Step 2: among overlapping, find a direct conversation if any
        if (overlapIds.length) {
          const { data: direct } = await supabase
            .from("conversations")
            .select("id")
            .in("id", overlapIds)
            .eq("type", "direct")
            .limit(1);
          const foundId = direct?.[0]?.id as string | undefined;
          if (foundId) {
            setActiveConversationId(foundId);
            setPeople([]);
            setSearch("");
            return;
          }
        }
      }
      
      // create a new direct conversation
      console.log("Creating conversation with userId:", userId);
      const { data: convIns, error: convErr } = await supabase
        .from("conversations")
        .insert({ type: "direct", created_by: userId })
        .select("id")
        .single();
      if (convErr) {
        console.error("Create conversation error details:", {
          message: convErr.message,
          details: convErr.details,
          hint: convErr.hint,
          code: convErr.code
        });
        alert(`Create conversation failed: ${convErr.message || 'Unknown error'}`);
        return;
      }
      const convId = convIns.id;
      
      // Insert current user first to satisfy potential RLS checks, then the peer
      const { error: partErrSelf } = await supabase
        .from("conversation_participants")
        .insert({ conversation_id: convId, user_id: userId, role: "member" });
      if (partErrSelf) {
        console.error("Add self participant error", partErrSelf);
        alert(`Add self failed: ${partErrSelf.message}`);
        return;
      }
      
      const { error: partErrPeer } = await supabase
        .from("conversation_participants")
        .insert({ conversation_id: convId, user_id: user.id, role: "member" });
      if (partErrPeer) {
        console.error("Add peer participant error", partErrPeer, { convId, me: userId, peer: user.id });
        alert(`Add peer failed: ${partErrPeer.message}`);
        return;
      }
      
      // Check if conversation already exists before adding
      setConversations((prev) => {
        const exists = prev.some(c => c.id === convId);
        if (!exists) {
          return [{ id: convId, type: "direct", group_id: null }, ...prev];
        }
        return prev;
      });
      setActiveConversationId(convId);
      setPeople([]);
      setSearch("");
    } catch (e) {
      console.error("Failed to start chat", e);
      alert(`Failed to start chat: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async function handleFileUpload(file: File) {
    if (file.size > 10 * 1024 * 1024) {
      alert("Max 10 MB");
      return;
    }
    setUploading(true);
    try {
      const bucket = "attachments";
      const path = `${userId ?? "anon"}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, {
        upsert: false,
      });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
      await supabase
        .from("messages")
        .insert({ 
          conversation_id: activeConversationId,
          sender_id: userId,
          kind: file.type.startsWith("image") ? "image" : "file", 
          file_url: urlData.publicUrl, 
          file_name: file.name, 
          file_size_bytes: file.size 
        });
    } catch (e) {
      console.error(e);
    } finally {
      setUploading(false);
    }
  }

  async function deleteMessage(messageId: string) {
    try {
      // First delete from database; only then update UI
      const { error } = await supabase
        .from("messages")
        .delete()
        .match({ id: messageId, sender_id: userId });
      if (error) {
        console.error("Delete failed", error);
        alert(`Could not delete message: ${error.message}`);
        return;
      }
      // Remove locally
      setMessages(prev => prev.filter(m => m.id !== messageId));
    } catch (e) {
      console.error(e);
      alert("Delete failed. Please try again.");
    } finally {
      setMenuOpenId(null);
    }
  }

  return (
    <SidebarProvider>
      <div className="min-h-[100svh] w-full flex">
        {/* New shadcn Sidebar */}
        <AppSidebar onConversationSelect={(id) => setActiveConversationId(id)} />
        {/* Main Chat Area */}
        <main className="flex-1 flex flex-col bg-white/70 dark:bg-black/40 backdrop-blur">
          {activeConversationId ? (
            <>
              {/* Chat header */}
              <div className="border-b border-neutral-200 dark:border-neutral-800 px-4 py-3 flex items-center gap-3">
                <Avatar>
                  <AvatarImage src="" alt="Chat" />
                  <AvatarFallback>CH</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setShowDetails(true)} title="View profile">
                  <div className="font-medium truncate">{headerTitle}</div>
                  <div className="text-xs text-neutral-500">Online</div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" className="rounded-xl h-8 px-3 transition-all duration-200 hover:scale-105"><Phone size={16} /></Button>
                  <Button variant="outline" className="rounded-xl h-8 px-3 transition-all duration-200 hover:scale-105"><Video size={16} /></Button>
                  <Button variant="outline" className="rounded-xl h-8 px-3 transition-all duration-200 hover:scale-105"><MoreVertical size={16} /></Button>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1">
                <div className="pl-4 pr-3 py-6 space-y-2">
                <AnimatePresence initial={false}>
                {messages.map((m, idx) => {
                  const prev = messages[idx - 1];
                  const showDay = !prev || !isSameDay(new Date(prev.created_at), new Date(m.created_at));
                  const isMine = Boolean(userId && m.sender_id === userId);
                  return (
                    <div key={m.id}>
                      {showDay && (
                        <motion.div
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2 }}
                          className="my-5 text-center text-xs text-neutral-500"
                        >
                          {isSameDay(new Date(), new Date(m.created_at)) ? "Today" : "Yesterday"}
                        </motion.div>
                      )}
                      <div className={cn("w-full flex items-end gap-2 px-2", isMine ? "justify-end" : "justify-start")}> 
                        {!isMine && (
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={peerProfile?.avatar_url || undefined} alt={peerProfile?.display_name || peerProfile?.email || 'User'} />
                            <AvatarFallback>{(peerProfile?.display_name || peerProfile?.email || 'U').charAt(0)}</AvatarFallback>
                          </Avatar>
                        )}
                        {/* Column wrapper for header + bubble */}
                        <div className={cn("flex flex-col max-w-[72%]", isMine ? "items-end" : "items-start")}> 
                          {/* Name/Time row outside bubble */}
                          <div className={cn("mb-1 text-[11px] tracking-wide", isMine ? "text-right text-neutral-500 dark:text-neutral-400" : "text-left text-neutral-500")}>
                            {isMine ? `${format(new Date(m.created_at), "p")} · You` : `${peerProfile?.display_name || peerProfile?.email || "User"} · ${format(new Date(m.created_at), "p")}`}
                          </div>
                          <DropdownMenu open={menuOpenId === m.id} onOpenChange={(o)=>!o && setMenuOpenId(null)}>
                            <DropdownMenuTrigger asChild>
                              <motion.div
                                layoutId={`msg-${m.id}`}
                                layout
                                initial={{ opacity: 0, y: 14, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10 }}
                                transition={{ type: "spring", stiffness: 260, damping: 20, mass: 0.6 }}
                                className={cn(
                                  "w-fit max-w-full flex flex-col rounded-2xl px-3 py-2 shadow-sm transition-all duration-300 message-bubble",
                                  isMine ? "bg-[var(--brand)] text-white items-end" : "bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 items-start"
                                )}
                                onContextMenu={(e)=>{ e.preventDefault(); setMenuOpenId(m.id);} }
                              >
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
                              </motion.div>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align={isMine ? "end" : "start"} className="w-48">
                            {isMine ? (
                              <>
                                <DropdownMenuItem className="text-destructive" onClick={()=>deleteMessage(m.id)}>
                                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={()=>setMenuOpenId(null)}>Cancel</DropdownMenuItem>
                              </>
                            ) : (
                              <>
                                <div className="px-2 py-1 text-xs text-muted-foreground">React</div>
                                <div className="px-2 pb-2 flex items-center gap-1.5">
                                  {QUICK_EMOJIS.map(em => (
                                    <button
                                      key={em}
                                      className="h-8 w-8 rounded-full hover:bg-accent flex items-center justify-center"
                                      onClick={()=>toggleReaction(m.id, em)}
                                    >
                                      <span className="text-lg leading-none">{em}</span>
                                    </button>
                                  ))}
                                </div>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={()=>setMenuOpenId(null)}>Close</DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        {isMine && (
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={selfProfile?.avatar_url || undefined} alt={selfProfile?.display_name || 'You'} />
                            <AvatarFallback>{(selfProfile?.display_name || 'You').charAt(0)}</AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                      {/* Reactions bar */}
                      {reactions[m.id] && (
                        <div className={cn("mt-1 flex gap-1", isMine ? "justify-end" : "justify-start") }>
                          {Object.entries(reactions[m.id]).filter(([, users]) => users.length > 0).map(([emoji, users]) => (
                            <div key={emoji} className={cn(
                              "px-1.5 py-0.5 rounded-full text-xs border",
                              isMine ? "bg-[var(--brand-600)]/20 text-white border-white/20" : "bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700"
                            )}>
                              <span className="mr-1 align-middle">{emoji}</span>
                              <span className="align-middle">{users.length}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
                </AnimatePresence>
                {/* Typing indicator */}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="max-w-[72%] rounded-2xl px-3 py-2 bg-neutral-100 dark:bg-neutral-800 animate-in slide-in-from-bottom-2 duration-300">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Scroll anchor */}
                <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Composer */}
              <div className="border-t border-neutral-200 dark:border-neutral-800 p-2">
                <div className="flex items-end gap-2">
                  <button className="p-2 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-all duration-200 hover:scale-110" onClick={() => fileInputRef.current?.click()} aria-label="Attach">
                    <Paperclip size={18} />
                  </button>
                  <button className="p-2 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-all duration-200 hover:scale-110" aria-label="Emoji"><Smile size={18} /></button>
                  <button className="p-2 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-all duration-200 hover:scale-110" aria-label="Image"><ImageIcon size={18} /></button>
                  <button className="p-2 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-all duration-200 hover:scale-110" aria-label="Mic"><Mic size={18} /></button>
                  <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => e.target.files && handleFileUpload(e.target.files[0])} />
                   <TextareaAutosize
                    value={draft}
                    onChange={(e) => {
                      setDraft(e.target.value);
                      sendTyping();
                    }}
                    minRows={1}
                    maxRows={6}
                     className="w-full resize-none rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 px-3 py-2 text-sm outline-none transition-all duration-300 focus:scale-105 focus:border-[var(--brand)] focus:shadow-lg focus-ring"
                    placeholder="Write something.."
                  />
                  <Button 
                    onClick={sendMessage} 
                    disabled={!draft.trim() || uploading || sendingMessage} 
                    className="h-10 px-4 rounded-2xl bg-[var(--brand)] hover:bg-[var(--brand-600)] text-white transition-all duration-300 hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 disabled:shadow-none"
                  >
                     <motion.div
                       initial={{ scale: 1 }}
                       animate={sendingMessage ? { scale: 0.9, opacity: 0.7 } : { scale: 1, opacity: 1 }}
                       transition={{ duration: 0.15 }}
                     >
                       {sendingMessage ? (
                         <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                       ) : (
                         <Send size={16} />
                       )}
                     </motion.div>
                  </Button>
                </div>
                <TypingIndicator visible={typingUserIds.size > 0} />
              </div>
            </>
          ) : (
            <div className="flex-1 grid place-items-center text-neutral-500 animate-in fade-in duration-500">Select a conversation</div>
          )}
        </main>

        {/* Details panel (toggle) */}
        <aside
          className={cn(
            "hidden xl:block bg-white/60 dark:bg-black/30 backdrop-blur transition-all duration-300 overflow-hidden",
            showDetails
              ? "w-[320px] border-l border-neutral-200 dark:border-neutral-800 p-4 opacity-100"
              : "w-0 p-0 border-0 opacity-0 pointer-events-none"
          )}
        >
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src="" alt="Profile" />
              <AvatarFallback>PR</AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium">Ricky Smith</div>
              <div className="text-xs text-green-600">Online</div>
            </div>
            <button className="ml-auto text-sm text-neutral-500 hover:underline transition-all duration-200 hover:scale-105" onClick={() => setShowDetails(false)}>Close</button>
          </div>
          <div className="mt-6 text-sm font-semibold">Customize Chat</div>
          <div className="mt-4 text-sm font-semibold">Media, Files and Links</div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-lg bg-neutral-200 dark:bg-neutral-800 transition-all duration-200 hover:scale-105 hover:bg-neutral-300 dark:hover:bg-neutral-700" />
            ))}
          </div>
          <div className="mt-6 text-sm font-semibold">Privacy and Support</div>
        </aside>
      </div>
    </SidebarProvider>
  );
}

