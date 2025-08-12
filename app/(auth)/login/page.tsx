"use client";
import { useEffect, useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { supabaseBrowser } from "@/lib/supabase/client";
import { isAllowedEmail } from "@/lib/utils";
import { Mail, Lock, ArrowRight, CheckCircle, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState<string | null>(null);
  const otpRef = useRef<HTMLInputElement>(null);

  // If user comes back via magic link (#access_token=...), process it and redirect
  useEffect(() => {
    const supabase = supabaseBrowser();
    // Touch the client so it parses the hash (detectSessionInUrl: true)
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        // Clean the hash and redirect
        if (typeof window !== "undefined") {
          window.history.replaceState({}, document.title, window.location.pathname);
          window.location.href = "/chats";
        }
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        if (typeof window !== "undefined") {
          window.history.replaceState({}, document.title, window.location.pathname);
          window.location.href = "/chats";
        }
      }
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  const handleSendOtp = async () => {
    setError(null);
    if (!isAllowedEmail(email)) {
      setError(`Please use your college email (@${process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN || "lpu.in"})`);
      return;
    }
    setLoading(true);
    try {
      const supabase = supabaseBrowser();
      const { error: err } = await supabase.auth.signInWithOtp({
        email,
        options: {
          // For OTP mode, the email template sends a code. No redirect needed.
        },
      });
      if (err) throw err;
      setSent(true);
      setTimeout(() => otpRef.current?.focus(), 200);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to send OTP";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!email || !otp) return;
    setVerifying(true);
    setVerifyMsg(null);
    try {
      const supabase = supabaseBrowser();
      const { error } = await supabase.auth.verifyOtp({ email, token: otp, type: "email" });
      if (error) throw new Error(error.message);
      setVerifyMsg("Verified! Redirecting...");
      window.location.href = "/";
    } catch (e) {
      const message = e instanceof Error ? e.message : "Invalid code";
      setVerifyMsg(message);
    } finally {
      setVerifying(false);
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
              Welcome to Campus Chat
            </CardTitle>
            <CardDescription className="text-base text-neutral-600 dark:text-neutral-400">
              Use your college email address to receive a one-time passcode
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <form onSubmit={(e) => { e.preventDefault(); handleSendOtp(); }}>
              <div className="flex flex-col gap-6">
                <div className="grid gap-3">
                  <Label htmlFor="email" className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder={`name@${process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN || "lpu.in"}`}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 h-12 text-base border-2 focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20 transition-all duration-200"
                      required
                    />
                  </div>
                </div>

                <Button 
                  type="submit"
                  disabled={loading || !email} 
                  className="w-full h-12 text-base font-medium bg-gradient-to-r from-[var(--brand)] to-[var(--brand-600)] hover:from-[var(--brand-600)] hover:to-[var(--brand-700)] text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Sending...
                    </div>
                  ) : sent ? (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      Resend OTP
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      Send OTP
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  )}
                </Button>
              </div>
            </form>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <div
              className="transition-all duration-500 ease-in-out overflow-hidden"
              style={{ 
                maxHeight: sent ? 300 : 0, 
                opacity: sent ? 1 : 0,
                transform: sent ? 'translateY(0)' : 'translateY(-10px)'
              }}
            >
              <div className="space-y-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
                <form onSubmit={(e) => { e.preventDefault(); handleVerify(); }}>
                  <div className="flex flex-col gap-6">
                    <div className="grid gap-3">
                      <Label htmlFor="otp" className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                        Verification Code
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400" />
                        <Input
                          ref={otpRef}
                          id="otp"
                          inputMode="numeric"
                          placeholder="Enter the 6-digit OTP"
                          value={otp}
                          onChange={(e) => setOtp(e.target.value)}
                          className="pl-10 h-12 text-base border-2 focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20 transition-all duration-200 text-center tracking-widest font-mono"
                          maxLength={6}
                          required
                        />
                      </div>
                    </div>

                    <Button 
                      type="submit"
                      disabled={verifying || !otp} 
                      className="w-full h-12 text-base font-medium bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                    >
                      {verifying ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Verifying...
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4" />
                          Verify OTP
                        </div>
                      )}
                    </Button>
                  </div>
                </form>

                {verifyMsg && (
                  <div className={`flex items-center gap-2 p-3 rounded-lg ${
                    verifyMsg.includes('Verified') 
                      ? 'bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800' 
                      : 'bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800'
                  }`}>
                    {verifyMsg.includes('Verified') ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-600" />
                    )}
                    <p className={`text-sm ${
                      verifyMsg.includes('Verified') 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {verifyMsg}
                    </p>
                  </div>
                )}

                <div className="text-center">
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    We sent the code to <span className="font-medium text-neutral-700 dark:text-neutral-300">{email}</span>
                  </p>
                  <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
                    Check your inbox and spam folder
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

