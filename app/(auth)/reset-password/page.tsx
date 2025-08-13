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
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-white via-blue-50 to-orange-50 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-800">
      <div className="w-full max-w-md">
        <Card className="border-0 shadow-2xl bg-white/80 dark:bg-neutral-950/80 backdrop-blur-sm">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-[var(--brand)] to-[var(--brand-600)] rounded-full flex items-center justify-center mb-4 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/lpu-logo.png" alt="LPU" width={44} height={44} className="rounded-full object-cover" />
            </div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-[var(--brand)] to-[var(--brand-600)] bg-clip-text text-transparent">Reset password</CardTitle>
            <CardDescription className="text-base text-neutral-600 dark:text-neutral-400">Use OTP to set a new password</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}
            {info && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg text-blue-700 dark:text-blue-300">
                <CheckCircle className="w-4 h-4" />
                <p className="text-sm">{info}</p>
              </div>
            )}

            {step === "email" && (
              <div className="grid gap-5">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <Input id="email" name="email" autoComplete="username email" type="email" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder={`name@${process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN || "lpu.in"}`} className="pl-10 h-12 text-base border-2 focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20" />
                  </div>
                </div>
                <Button onClick={sendOtp} disabled={loading || !email} className="h-12 bg-[var(--brand)] hover:bg-[var(--brand-600)]">Send OTP <ArrowRight size={16} className="ml-2"/></Button>
              </div>
            )}

            {step === "otp" && (
              <div className="grid gap-5">
                <div className="grid gap-2">
                  <Label htmlFor="otp">Enter OTP</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <Input id="otp" inputMode="numeric" maxLength={6} value={otp} onChange={(e)=>setOtp(e.target.value)} placeholder="6-digit code" className="pl-10 text-center tracking-widest font-mono h-12 text-base border-2 focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20" />
                  </div>
                </div>
                <Button onClick={verify} disabled={loading || !otp} className="h-12 bg-green-600 hover:bg-green-700">Verify</Button>
              </div>
            )}

            {step === "newpass" && (
              <div className="grid gap-5">
                <div className="grid gap-2">
                  <Label htmlFor="pass">New password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <Input id="pass" name="new-password" autoComplete="new-password" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="At least 8 characters" className="pl-10 h-12 text-base border-2 focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20" />
                  </div>
                </div>
                <Button onClick={setNewPassword} disabled={loading || !password} className="h-12 bg-[var(--brand)] hover:bg-[var(--brand-600)]">Set new password</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


