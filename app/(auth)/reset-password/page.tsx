"use client";
import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { supabaseBrowser } from "@/lib/supabase/client";
import { isAllowedEmail } from "@/lib/utils";
import { Mail, Lock, CheckCircle, AlertCircle, ArrowRight } from "lucide-react";

export default function ResetPasswordPage() {
  const [step, setStep] = useState<"email" | "otp" | "newpass">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const sendOtp = async () => {
    setError(null);
    if (!isAllowedEmail(email)) { setError(`Use your college email (@${process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN || "lpu.in"})`); return; }
    setLoading(true);
    try {
      const supabase = supabaseBrowser();
      const { error } = await supabase.auth.signInWithOtp({ email });
      if (error) throw new Error(error.message);
      setStep("otp");
      setInfo("OTP sent to your email.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send OTP");
    } finally { setLoading(false); }
  };

  const verify = async () => {
    setError(null);
    setLoading(true);
    try {
      const supabase = supabaseBrowser();
      const { data, error } = await supabase.auth.verifyOtp({ email, token: otp, type: "email" });
      if (error) throw new Error(error.message);
      if (!data.user) throw new Error("Verification failed");
      setStep("newpass");
      setInfo("Verified. Set a new password.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid code");
    } finally { setLoading(false); }
  };

  const setNewPassword = async () => {
    setError(null);
    if (password.length < 8) { setError("Password should be at least 8 characters"); return; }
    setLoading(true);
    try {
      const supabase = supabaseBrowser();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw new Error(error.message);
      setInfo("Password updated. You can login now.");
      window.location.href = "/login";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update password");
    } finally { setLoading(false); }
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
              Reset password
            </CardTitle>
            <CardDescription className="text-base text-neutral-600 dark:text-neutral-400">
              Use OTP to set a new password
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl animate-in slide-in-from-top-2">
                <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                <p className="text-sm text-red-600 dark:text-red-400 font-medium">{error}</p>
              </div>
            )}
            {info && (
              <div className="flex items-center gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-700 dark:text-blue-300 animate-in slide-in-from-top-2">
                <CheckCircle className="w-4 h-4" />
                <p className="text-sm font-medium">{info}</p>
              </div>
            )}

            {step === "email" && (
              <div className="grid gap-5 animate-in slide-in-from-right duration-300">
                <div className="grid gap-2">
                  <Label htmlFor="email" className="ml-1 text-xs uppercase tracking-wider text-neutral-500 font-semibold">Email</Label>
                  <div className="relative group">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 group-focus-within:text-[var(--brand)] transition-colors" />
                    <Input id="email" name="email" autoComplete="username email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={`name@${process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN || "lpu.in"}`} className="pl-10 h-12 bg-white/50 dark:bg-black/20 border-neutral-200 dark:border-neutral-800 focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand)]/10 rounded-xl transition-all" />
                  </div>
                </div>
                <Button onClick={sendOtp} disabled={loading || !email} className="h-12 rounded-xl bg-gradient-to-r from-[var(--brand)] to-[var(--brand-600)] hover:via-[var(--brand-600)] hover:to-[var(--brand)] text-white shadow-lg shadow-teal-500/20 hover:shadow-teal-500/40 transition-all hover:scale-[1.02] active:scale-[0.98]">
                  {loading ? "Sending..." : (<span className="flex items-center gap-2">Send OTP <ArrowRight size={16} /></span>)}
                </Button>
              </div>
            )}

            {step === "otp" && (
              <div className="grid gap-5 animate-in slide-in-from-right duration-300">
                <div className="grid gap-2">
                  <Label htmlFor="otp" className="ml-1 text-xs uppercase tracking-wider text-neutral-500 font-semibold">Enter OTP</Label>
                  <div className="relative group">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 group-focus-within:text-[var(--brand)] transition-colors" />
                    <Input id="otp" inputMode="numeric" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="6-digit code" className="pl-10 text-center tracking-widest font-mono h-12 text-lg bg-white/50 dark:bg-black/20 border-neutral-200 dark:border-neutral-800 focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand)]/10 rounded-xl transition-all" />
                  </div>
                </div>
                <Button onClick={verify} disabled={loading || !otp} className="h-12 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-lg shadow-green-500/20 hover:shadow-green-500/40 transition-all hover:scale-[1.02] active:scale-[0.98]">
                  {loading ? "Verifying..." : "Verify & Continue"}
                </Button>
              </div>
            )}

            {step === "newpass" && (
              <div className="grid gap-5 animate-in slide-in-from-right duration-300">
                <div className="grid gap-2">
                  <Label htmlFor="pass" className="ml-1 text-xs uppercase tracking-wider text-neutral-500 font-semibold">New password</Label>
                  <div className="relative group">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 group-focus-within:text-[var(--brand)] transition-colors" />
                    <Input id="pass" name="new-password" autoComplete="new-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" className="pl-10 h-12 bg-white/50 dark:bg-black/20 border-neutral-200 dark:border-neutral-800 focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand)]/10 rounded-xl transition-all" />
                  </div>
                </div>
                <Button onClick={setNewPassword} disabled={loading || !password} className="h-12 rounded-xl bg-gradient-to-r from-[var(--brand)] to-[var(--brand-600)] hover:via-[var(--brand-600)] hover:to-[var(--brand)] text-white shadow-lg shadow-teal-500/20 hover:shadow-teal-500/40 transition-all hover:scale-[1.02] active:scale-[0.98]">
                  {loading ? "Updating..." : "Set new password"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


