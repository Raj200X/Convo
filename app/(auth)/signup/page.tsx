"use client";
import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { supabaseBrowser } from "@/lib/supabase/client";
import { isAllowedEmail } from "@/lib/utils";
import { Mail, Lock, User as UserIcon, CheckCircle, AlertCircle, ArrowRight } from "lucide-react";

export default function SignupPage() {
  const [step, setStep] = useState<"email" | "otp" | "profile">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const otpRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const supabase = supabaseBrowser();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) window.location.href = "/chats";
    });
  }, []);

  const sendOtp = async () => {
    setError(null);
    if (!isAllowedEmail(email)) {
      setError(`Please use your college email (@${process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN || "lpu.in"})`);
      return;
    }
    setLoading(true);
    try {
      const supabase = supabaseBrowser();
      // prevent re-registering existing accounts
      const { data: users, error: listErr } = await supabase.auth.admin.listUsers();
      if (!listErr) {
        const exists = users.users.some(u => (u.email || "").toLowerCase() === email.toLowerCase());
        if (exists) {
          setError("This email is already registered. Please login or reset your password.");
          setLoading(false);
          return;
        }
      }
      const { error } = await supabase.auth.signInWithOtp({ email });
      if (error) throw new Error(error.message);
      setStep("otp");
      setInfo("OTP sent to your email.");
      setTimeout(() => otpRef.current?.focus(), 150);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    setError(null);
    if (!otp) return;
    setLoading(true);
    try {
      const supabase = supabaseBrowser();
      const { data, error } = await supabase.auth.verifyOtp({ email, token: otp, type: "email" });
      if (error) throw new Error(error.message);
      if (!data.user) throw new Error("Verification failed");
      // Pre-create a minimal profile if not exists
      await supabase.from("profiles").upsert({ id: data.user.id, email: email });
      setStep("profile");
      setInfo("Verified. Create your password and display name.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid code");
    } finally {
      setLoading(false);
    }
  };

  const completeProfile = async () => {
    setError(null);
    if (password.length < 8) { setError("Password should be at least 8 characters"); return; }
    if (password !== confirm) { setError("Passwords do not match"); return; }
    if (!displayName.trim()) { setError("Please enter a display name"); return; }
    setLoading(true);
    try {
      const supabase = supabaseBrowser();
      const { data: session } = await supabase.auth.getUser();
      const uid = session.user?.id;
      if (!uid) throw new Error("Not authenticated after OTP");
      // Set a password using updateUser
      const { error: updErr } = await supabase.auth.updateUser({ password });
      if (updErr) throw new Error(updErr.message);
      // Save display name
      await supabase.from("profiles").update({ display_name: displayName }).eq("id", uid);
      setInfo("Account created. Redirecting to login...");
      window.location.href = "/login";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to complete profile");
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
              Create your account
            </CardTitle>
            <CardDescription className="text-base text-neutral-600 dark:text-neutral-400">
              Join the conversation today
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
                  <Label htmlFor="email" className="ml-1 text-xs uppercase tracking-wider text-neutral-500 font-semibold">College email</Label>
                  <div className="relative group">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 group-focus-within:text-[var(--brand)] transition-colors" />
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={`name@${process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN || "lpu.in"}`} className="pl-10 h-12 bg-white/50 dark:bg-black/20 border-neutral-200 dark:border-neutral-800 focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand)]/10 rounded-xl transition-all" />
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
                    <Input ref={otpRef} id="otp" inputMode="numeric" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="6-digit code" className="pl-10 text-center tracking-widest font-mono h-12 text-lg bg-white/50 dark:bg-black/20 border-neutral-200 dark:border-neutral-800 focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand)]/10 rounded-xl transition-all" />
                  </div>
                </div>
                <Button onClick={verifyOtp} disabled={loading || !otp} className="h-12 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-lg shadow-green-500/20 hover:shadow-green-500/40 transition-all hover:scale-[1.02] active:scale-[0.98]">
                  {loading ? "Verifying..." : "Verify & Continue"}
                </Button>
              </div>
            )}

            {step === "profile" && (
              <div className="grid gap-5 animate-in slide-in-from-right duration-300">
                <div className="grid gap-2">
                  <Label htmlFor="display" className="ml-1 text-xs uppercase tracking-wider text-neutral-500 font-semibold">Display name</Label>
                  <div className="relative group">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 group-focus-within:text-[var(--brand)] transition-colors" />
                    <Input id="display" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" className="pl-10 h-12 bg-white/50 dark:bg-black/20 border-neutral-200 dark:border-neutral-800 focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand)]/10 rounded-xl transition-all" />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="pass" className="ml-1 text-xs uppercase tracking-wider text-neutral-500 font-semibold">Create password</Label>
                  <div className="relative group">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 group-focus-within:text-[var(--brand)] transition-colors" />
                    <Input id="pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" className="pl-10 h-12 bg-white/50 dark:bg-black/20 border-neutral-200 dark:border-neutral-800 focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand)]/10 rounded-xl transition-all" />
                  </div>
                  {/* Strength meter */}
                  <PasswordStrengthMeter password={password} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="confirm" className="ml-1 text-xs uppercase tracking-wider text-neutral-500 font-semibold">Re-enter password</Label>
                  <div className="relative group">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 group-focus-within:text-[var(--brand)] transition-colors" />
                    <Input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Repeat password" className="pl-10 h-12 bg-white/50 dark:bg-black/20 border-neutral-200 dark:border-neutral-800 focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand)]/10 rounded-xl transition-all" />
                  </div>
                </div>
                <Button onClick={completeProfile} disabled={loading || !displayName || !password || !confirm} className="h-12 rounded-xl bg-gradient-to-r from-[var(--brand)] to-[var(--brand-600)] hover:via-[var(--brand-600)] hover:to-[var(--brand)] text-white shadow-lg shadow-teal-500/20 hover:shadow-teal-500/40 transition-all hover:scale-[1.02] active:scale-[0.98]">
                  {loading ? "Creating..." : "Create Account"}
                </Button>
              </div>
            )}

            <div className="text-sm text-center text-neutral-600 dark:text-neutral-400 pt-2">
              Already have an account? <a href="/login" className="text-[var(--brand)] font-medium hover:underline">Login</a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function PasswordStrengthMeter({ password }: { password: string }) {
  const score = getStrengthScore(password);
  const labels = ["Very weak", "Weak", "Fair", "Good", "Strong"];
  const colors = ["bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-lime-500", "bg-green-600"];
  const width = ["w-1/5", "w-2/5", "w-3/5", "w-4/5", "w-full"][score];
  return (
    <div className="mt-1">
      <div className="h-2 w-full bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
        <div className={`h-2 ${width} ${colors[score]} transition-all duration-300`} />
      </div>
      <div className="text-xs mt-1 text-neutral-500">{labels[score]}</div>
      <ul className="text-[11px] mt-1 text-neutral-500 list-disc pl-5 space-y-0.5">
        <li>8+ characters</li>
        <li>Upper and lower case</li>
        <li>Number</li>
        <li>Symbol</li>
      </ul>
    </div>
  );
}

function getStrengthScore(pass: string): 0 | 1 | 2 | 3 | 4 {
  let s = 0;
  if (pass.length >= 8) s++;
  if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) s++;
  if (/\d/.test(pass)) s++;
  if (/[^A-Za-z0-9]/.test(pass)) s++;
  return Math.min(4, s) as 0 | 1 | 2 | 3 | 4;
}


