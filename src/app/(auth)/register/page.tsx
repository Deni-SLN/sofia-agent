"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Zap, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const demoMode = !(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    try {
      const fd = new FormData(e.currentTarget);
      const email = String(fd.get("email") || "");
      const password = String(fd.get("password") || "");
      if (demoMode) {
        // Mode demo: langsung masuk tanpa akun Supabase.
        router.push("/dashboard");
        router.refresh();
        return;
      }
      const { createClient } = await import("@/lib/supabase/client");
      const sb = createClient();
      const { data, error } = await sb.auth.signUp({ email, password });
      if (error) {
        setErr(error.message);
        return;
      }
      // Jika email confirmation aktif, tampilkan info; kalau langsung ada session, masuk.
      if (data.session) {
        router.push("/dashboard");
        router.refresh();
      } else {
        setErr("Akun dibuat. Cek email untuk verifikasi sebelum login.");
      }
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : String(e2));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center mb-4">
            <Zap className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary">Create Account</h1>
          <p className="text-sm text-text-muted mt-1">Start your AI trading journey</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {err && <p className="text-sm text-danger">{err}</p>}
          {demoMode && (
            <p className="rounded-btn bg-warning/10 px-3 py-1.5 text-xs text-warning">
              Mode demo — pendaftaran tanpa Supabase, klik Create Account untuk masuk
            </p>
          )}
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-secondary">Full Name</label>
            <Input type="text" name="name" placeholder="Denis Sulaeman" required />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-text-secondary">Email</label>
            <Input type="email" name="email" placeholder="you@example.com" required />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-text-secondary">Password</label>
            <div className="relative">
              <Input type={showPassword ? "text" : "password"} name="password" placeholder="Min. 12 characters" required minLength={12} />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating account..." : "Create Account"}
          </Button>
        </form>

        <p className="text-center text-sm text-text-muted mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Sign In
          </Link>
        </p>
      </Card>
    </div>
  );
}
