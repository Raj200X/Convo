"use client";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function VerifyOtpPage() {
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleVerify = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const supabase = supabaseBrowser();
      const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
      if (error) throw new Error(error.message);
      setMessage("Verified! Redirecting...");
      window.location.href = "/";
    } catch (e) {
      const message = e instanceof Error ? e.message : "Invalid code";
      setMessage(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-6 shadow-lg">
        <h1 className="text-2xl font-semibold mb-2">Verify code</h1>
        <div className="space-y-4">
          <Input type="email" placeholder="Your email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input inputMode="numeric" placeholder="6-digit code" value={token} onChange={(e) => setToken(e.target.value)} />
          <Button disabled={loading || !email || !token} onClick={handleVerify} className="w-full">
            {loading ? "Verifying..." : "Verify"}
          </Button>
          {message && <p className="text-sm">{message}</p>}
        </div>
      </div>
    </div>
  );
}

