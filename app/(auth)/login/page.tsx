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
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-white via-blue-50 to-orange-50 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-800">
      <div className="w-full max-w-md">
        <Card className="border-0 shadow-2xl bg-white/80 dark:bg-neutral-950/80 backdrop-blur-sm">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-[var(--brand)] to-[var(--brand-600)] rounded-full flex items-center justify-center mb-4 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/lpu-logo.png" alt="LPU" width={44} height={44} className="rounded-full object-cover" />
            </div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-[var(--brand)] to-[var(--brand-600)] bg-clip-text text-transparent">
              Welcome back
            </CardTitle>
            <CardDescription className="text-base text-neutral-600 dark:text-neutral-400">
              Login with your email and password
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}
            <form className="grid gap-5" autoComplete="on" onSubmit={handleLogin}>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  <Input id="email" name="email" autoComplete="username email" type="email" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder={`name@${process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN || "lpu.in"}`} className="pl-10 h-12 text-base border-2 focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20" />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  <Input id="password" name="password" autoComplete="current-password" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="••••••••" className="pl-10 h-12 text-base border-2 focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20" />
                </div>
              </div>
              <Button type="submit" disabled={loading || !email || !password} className="h-12 bg-[var(--brand)] hover:bg-[var(--brand-600)]">
                {loading ? "Signing in..." : (<span className="flex items-center gap-2"><LogIn size={16}/>Login</span>)}
              </Button>
              <div className="flex items-center justify-between text-sm text-neutral-600 dark:text-neutral-400">
                <Link href="/reset-password" className="hover:underline">Forgot password?</Link>
                <span>
                  New here? <Link href="/signup" className="text-[var(--brand)] hover:underline">Create an account</Link>
                </span>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

