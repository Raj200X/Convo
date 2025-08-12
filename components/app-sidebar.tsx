"use client"

import * as React from "react"
import { 
  MessageSquare, 
  Users, 
  Users2, 
  Settings, 
  LogOut, 
  Search,
  Plus,
  Phone,
  Video,
  MoreVertical,
  Mail,
  User
} from "lucide-react"


import { NavUser } from "@/components/nav-user"
import { Label } from "@/components/ui/label"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { supabaseBrowser } from "@/lib/supabase/client"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import ThemeToggle from "@/components/ui/theme-toggle"

// Chat application data structure
const chatData = {
  user: {
    name: "Student",
    email: "student@lpu.in",
    avatar: "/lpu-logo.png",
  },
  navMain: [
    {
      title: "People",
      url: "#people",
      icon: Users,
      isActive: false,
    },
    {
      title: "Groups",
      url: "#groups",
      icon: Users2,
      isActive: false,
    },
    {
      title: "Profile",
      url: "#profile",
      icon: MessageSquare,
      isActive: false,
    },
  ],
  conversations: [
    {
      id: "1",
      name: "John Doe",
      email: "john@lpu.in",
      lastMessage: "Hey, how's the project going?",
      time: "2m ago",
      unread: 2,
      avatar: null,
    },
    {
      id: "2",
      name: "Study Group",
      email: "study@lpu.in",
      lastMessage: "Meeting tomorrow at 10 AM",
      time: "1h ago",
      unread: 0,
      avatar: null,
      isGroup: true,
    },
    {
      id: "3",
      name: "Sarah Wilson",
      email: "sarah@lpu.in",
      lastMessage: "Thanks for the notes!",
      time: "3h ago",
      unread: 1,
      avatar: null,
    },
  ],
}

export function AppSidebar() {
  const { isMobile, setOpen } = useSidebar()
  const [activeItem, setActiveItem] = React.useState(chatData.navMain[0])
  const supabase = React.useMemo(() => supabaseBrowser(), [])
  const [conversations, setConversations] = React.useState<Array<{id:string; name:string; email:string; unread:number; avatar:string|null; lastMessage?:string; time?:string;}>>([])
  const [searchQuery, setSearchQuery] = React.useState("")
  const [userId, setUserId] = React.useState<string | null>(null)
  const [people, setPeople] = React.useState<Array<{id:string; email:string; display_name:string|null; avatar_url:string|null}>>([])

  React.useEffect(()=>{
    (async()=>{
      const { data: { user } } = await supabase.auth.getUser()
      setUserId(user?.id ?? null)
      if (!user) return
      // load user's conversations
      const { data: parts } = await supabase
        .from('conversation_participants')
        .select('conversation_id, conversations(id,type), profiles:profiles!inner(id,email,display_name)')
        .eq('user_id', user.id)

      const convIds = (parts||[]).map((p:any)=>p.conversation_id)
      if (convIds.length){
        // resolve display names by finding the other participant for direct
        const { data: others } = await supabase
          .from('conversation_participants')
          .select('conversation_id, user_id, profiles:profiles(email, display_name, avatar_url)')
          .in('conversation_id', convIds)
        const byConv: Record<string, any[]> = {}
        ;(others||[]).forEach((r:any)=>{ (byConv[r.conversation_id] ||= []).push(r) })
        const items = Object.entries(byConv).map(([cid, rows])=>{
          const other = rows.find((r:any)=> r.user_id !== user.id)
          return {
            id: cid,
            name: other?.profiles?.display_name || other?.profiles?.email || '',
            email: other?.profiles?.email || '',
            avatar: other?.profiles?.avatar_url || null,
            unread: 0,
          }
        })
        setConversations(items)
      }
    })()
  },[supabase])

  React.useEffect(()=>{
    const t = setTimeout(async ()=>{
      const q = searchQuery.trim()
      if (q.length < 2){ setPeople([]); return }
      const { data } = await supabase
        .from('profiles')
        .select('id,email,display_name,avatar_url')
        .or(`email.ilike.%${q}%,display_name.ilike.%${q}%`)
        .limit(8)
      setPeople((data||[]) as any)
    }, 300)
    return ()=>clearTimeout(t)
  },[searchQuery, supabase])

  async function startDirectWith(person:{id:string; email:string; display_name:string|null; avatar_url:string|null}){
    if (!userId) return
    // find existing
    const { data: my } = await supabase.from('conversation_participants').select('conversation_id').eq('user_id', userId)
    const ids = (my||[]).map((r:any)=>r.conversation_id)
    if (ids.length){
      const { data: overlap } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', person.id)
        .in('conversation_id', ids)
      if ((overlap||[]).length){
        const cid = overlap![0].conversation_id as string
        localStorage.setItem('activeConversationId', cid)
        return
      }
    }
    // create
    const { data: conv } = await supabase.from('conversations').insert({ type: 'direct', created_by: userId }).select('id').single()
    if (!conv) return
    await supabase.from('conversation_participants').insert([
      { conversation_id: conv.id, user_id: userId, role: 'member' },
      { conversation_id: conv.id, user_id: person.id, role: 'member' },
    ])
    setConversations(prev => [{ id: conv.id, name: person.display_name || person.email, email: person.email, avatar: person.avatar_url, unread: 0 }, ...prev])
    localStorage.setItem('activeConversationId', conv.id)
  }

  const filteredConversations = conversations.filter(conv =>
    conv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <Sidebar>
      {/* Icon sidebar - always visible */}
      <Sidebar
        collapsible="icon"
        className="w-[calc(var(--sidebar-width-icon)+1px)]! border-r"
      >
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild className="md:h-8 md:p-0">
                <a href="#">
                  <div className="bg-[var(--brand)] text-white flex aspect-square size-8 items-center justify-center rounded-lg overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src="/lpu-logo.png" 
                      alt="LPU"
                      width={28}
                      height={28}
                      className="rounded-md object-cover"
                    />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">Campus</span>
                    <span className="truncate text-xs">Chat</span>
                  </div>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent className="px-1.5 md:px-0">
              <SidebarMenu>
                {chatData.navMain.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      tooltip={{
                        children: item.title,
                        hidden: false,
                      }}
                      onClick={() => {
                        setActiveItem(item)
                        setOpen(true)
                      }}
                      isActive={activeItem?.title === item.title}
                      className="px-2.5 md:px-2"
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <div className="px-2 pb-2 space-y-2">
            <div className="flex items-center justify-center">
              <ThemeToggle />
            </div>
            <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    tooltip={{
                      children: "Profile",
                      hidden: false,
                    }}
                    className="px-2.5 md:px-2"
                    onClick={() => (window.location.href = "/settings")}
                  >
                    <User />
                    <span>Profile</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip={{
                    children: "Settings",
                    hidden: false,
                  }}
                  className="px-2.5 md:px-2"
                >
                  <Settings />
                  <span>Settings</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip={{
                    children: "Logout",
                    hidden: false,
                  }}
                  className="px-2.5 md:px-2 text-red-600 hover:text-red-700"
                  onClick={() => window.location.href = "/logout"}
                >
                  <LogOut />
                  <span>Logout</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </div>
          <NavUser user={chatData.user} />
        </SidebarFooter>
      </Sidebar>

      {/* Main sidebar - collapsible */}
      <Sidebar collapsible="icon" className="hidden flex-1 md:flex">
        <SidebarHeader className="gap-3.5 border-b p-4">
          <div className="flex w-full items-center justify-between">
            <div className="text-foreground text-base font-medium">
              {activeItem?.title}
            </div>
            <Label className="flex items-center gap-2 text-sm">
              <span>Online</span>
              <Switch className="shadow-none" />
            </Label>
          </div>
          <SidebarInput 
            placeholder="Search by name or email..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup className="px-0">
            <SidebarGroupContent>
              {/* Action buttons */}
              <div className="p-4 space-y-2">
                <Button className="w-full bg-[var(--brand)] hover:bg-[var(--brand-600)] text-white" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  New Chat
                </Button>
                <Button variant="outline" className="w-full" size="sm">
                  <Users2 className="w-4 h-4 mr-2" />
                  New Group
                </Button>
              </div>
              
               {/* Search results */}
               {people.length > 0 && (
                 <div className="px-4">
                   <Label className="text-xs text-muted-foreground px-2 mb-2 block">Start new chat</Label>
                   <div className="space-y-1 mb-4">
                     {people.map((p)=> (
                       <div key={p.id} className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex items-center gap-3 rounded-lg p-3 cursor-pointer" onClick={()=>startDirectWith(p)}>
                         <Avatar className="h-8 w-8"><AvatarImage src={p.avatar_url||undefined} /><AvatarFallback>{(p.display_name||p.email||'?').charAt(0)}</AvatarFallback></Avatar>
                         <div className="min-w-0">
                           <div className="text-sm truncate">{p.display_name || p.email}</div>
                           {p.display_name && <div className="text-xs text-muted-foreground truncate">{p.email}</div>}
                         </div>
                       </div>
                     ))}
                   </div>
                 </div>
               )}

               {/* Conversations list */}
              <div className="px-4 pb-4">
                <Label className="text-sm font-semibold px-2 mb-3 block">Conversations</Label>
                <div className="space-y-1">
                  {filteredConversations.map((conv) => (
                    <div
                      key={conv.id}
                      className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex items-center gap-3 rounded-lg p-3 cursor-pointer transition-colors"
                      onClick={() => {
                        try { localStorage.setItem('activeConversationId', conv.id) } catch {}
                        if (isMobile) setOpen(false)
                      }}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={conv.avatar || undefined} alt={conv.name} />
                        <AvatarFallback className="rounded-lg">
                          {conv.isGroup ? "G" : conv.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-sm font-medium truncate">{conv.name || conv.email || ''}</div>
                          <div className="text-xs text-muted-foreground">{conv.time}</div>
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {conv.lastMessage}
                        </div>
                      </div>
                      {conv.unread > 0 && (
                        <div className="h-5 w-5 rounded-full bg-[var(--brand)] text-white text-xs flex items-center justify-center">
                          {conv.unread}
                        </div>
                      )}
                  </div>
              ))}
                </div>
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <div className="px-4 pb-4">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton className="w-full" onClick={() => (window.location.href = "/settings")}>
                  <User />
                  <span>Profile</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton className="w-full text-red-600 hover:text-red-700" onClick={() => (window.location.href = "/logout")}>
                  <LogOut />
                  <span>Logout</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </div>
        </SidebarFooter>
      </Sidebar>
    </Sidebar>
  )
}
