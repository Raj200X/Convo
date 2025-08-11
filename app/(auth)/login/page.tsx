"use client";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabaseBrowser } from "@/lib/supabase/client";
import { isAllowedEmail } from "@/lib/utils";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setError(`Please use your college email (@${process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN}).`);
      return;
    }
    setLoading(true);
    try {
      const supabase = supabaseBrowser();
      const { error: err } = await supabase.auth.signInWithOtp({
        email,
        options: {
          // Email OTP: ensure it's enabled in Supabase Auth settings
          emailRedirectTo: typeof window !== "undefined" ? window.location.origin + "/login" : undefined,
        },
      });
      if (err) throw err;
      setSent(true);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to send OTP";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-white to-blue-50 dark:from-neutral-950 dark:to-neutral-900">
      <div className="w-full max-w-md rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-6 shadow-lg">
        <h1 className="text-2xl font-semibold mb-2">Sign in</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6">Use your college email address to receive a one-time passcode.</p>
        <div className="space-y-4">
          <Input
            type="email"
            placeholder={`name@${process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN}`}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button disabled={loading || !email} onClick={handleSendOtp} className="w-full">
            {loading ? "Sending..." : sent ? "Resend OTP" : "Send OTP"}
          </Button>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {sent && <p className="text-sm text-green-700">Check your inbox for the OTP code.</p>}
        </div>
      </div>
    </div>
  );
}

