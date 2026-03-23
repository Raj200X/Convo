"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { supabaseBrowser } from "@/lib/supabase/client";
import { isAllowedEmail } from "@/lib/utils";
import { Mail, Lock, LogIn, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = supabaseBrowser();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) window.location.href = "/chats";
    });
  }, []);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    if (!isAllowedEmail(email)) {
      setError(`Please use your college email (@${process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN || "lpu.in"})`);
      return;
    }
    setLoading(true);
    try {
      const supabase = supabaseBrowser();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
      window.location.href = "/chats";
    } catch (e) {
      const message = e instanceof Error ? e.message : "Login failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden bg-neutral-50/50 dark:bg-neutral-950/50">
      {/* Animated Mesh Gradient Background */}
      <div className="fixed inset-0 z-[-1] pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-teal-500/20 blur-[120px] animate-float" />
        <div className="absolute top-[20%] right-[-5%] w-[40%] h-[40%] rounded-full bg-cyan-500/20 blur-[120px] animate-float" style={{ animationDelay: '-2s' }} />
        <div className="absolute bottom-[-10%] left-[20%] w-[45%] h-[45%] rounded-full bg-emerald-500/20 blur-[120px] animate-float" style={{ animationDelay: '-4s' }} />
      </div>

      <div className="w-full max-w-md animate-in scale-in duration-500">
        <Card className="border border-white/20 dark:border-white/10 shadow-2xl bg-white/60 dark:bg-black/40 backdrop-blur-2xl">
          <CardHeader className="text-center space-y-2 pb-6">
            <div className="mx-auto w-20 h-20 flex items-center justify-center mb-4 overflow-hidden shadow-lg rounded-2xl bg-white dark:bg-neutral-900 ring-1 ring-black/5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="Convo" width={80} height={80} className="object-cover" />
            </div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-[var(--brand)] to-[var(--brand-600)] bg-clip-text text-transparent">
              Welcome back
            </CardTitle>
            <CardDescription className="text-base text-neutral-600 dark:text-neutral-400">
              Login to continue your conversations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl animate-in slide-in-from-top-2">
                <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                <p className="text-sm text-red-600 dark:text-red-400 font-medium">{error}</p>
              </div>
            )}
            <form className="grid gap-5" autoComplete="on" onSubmit={handleLogin}>
              <div className="grid gap-2">
                <Label htmlFor="email" className="ml-1 text-xs uppercase tracking-wider text-neutral-500 font-semibold">Email</Label>
                <div className="relative group">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 group-focus-within:text-[var(--brand)] transition-colors" />
                  <Input
                    id="email"
                    name="email"
                    autoComplete="username email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={`name@${process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN || "lpu.in"}`}
                    className="pl-10 h-12 bg-white/50 dark:bg-black/20 border-neutral-200 dark:border-neutral-800 focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand)]/10 rounded-xl transition-all"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password" className="ml-1 text-xs uppercase tracking-wider text-neutral-500 font-semibold">Password</Label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 group-focus-within:text-[var(--brand)] transition-colors" />
                  <Input
                    id="password"
                    name="password"
                    autoComplete="current-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-10 h-12 bg-white/50 dark:bg-black/20 border-neutral-200 dark:border-neutral-800 focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand)]/10 rounded-xl transition-all"
                  />
                </div>
              </div>
              <Button
                type="submit"
                disabled={loading || !email || !password}
                className="h-12 rounded-xl bg-gradient-to-r from-[var(--brand)] to-[var(--brand-600)] hover:via-[var(--brand-600)] hover:to-[var(--brand)] text-white shadow-lg shadow-teal-500/20 hover:shadow-teal-500/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <span className="flex items-center gap-2 font-medium">Sign In <LogIn size={18} /></span>
                )}
              </Button>
              <div className="flex items-center justify-between text-sm text-neutral-600 dark:text-neutral-400 pt-2">
                <Link href="/reset-password" className="hover:text-[var(--brand)] transition-colors hover:underline">Forgot password?</Link>
                <span>
                  New here? <Link href="/signup" className="text-[var(--brand)] font-medium hover:underline">Create account</Link>
                </span>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

