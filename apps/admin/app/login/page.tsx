"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/api";
import { setSession } from "@/lib/auth";
import { Button, Panel } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await login(email.trim(), password);
    if (!res.ok) {
      setError(res.error.message);
      setBusy(false);
      return;
    }
    if (!res.data.user.isAdmin) {
      setError("This account doesn't have admin access.");
      setBusy(false);
      return;
    }
    setSession(res.data.token, res.data.user.email);
    router.replace("/");
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-casper-red text-2xl text-white shadow-[0_0_24px_-4px_rgba(244,77,96,0.6)]">
            👻
          </div>
          <h1 className="text-2xl font-light">
            Casper <span className="iridescent-text">Admin</span>
          </h1>
          <p className="mt-1 text-xs text-iron-slate">Control center — admins only</p>
        </div>

        <Panel className="p-6">
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-iron-slate">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                className="w-full rounded-lg border border-line bg-panel-2 px-3 py-2 text-sm outline-none focus:border-iron-slate"
                placeholder="you@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-iron-slate">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full rounded-lg border border-line bg-panel-2 px-3 py-2 pr-11 text-sm outline-none focus:border-iron-slate"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  title={showPassword ? "Hide password" : "Show password"}
                  className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-base text-iron-slate transition hover:scale-110"
                >
                  {showPassword ? "🐵" : "🙈"}
                </button>
              </div>
            </div>
            {error && (
              <p className="rounded-lg bg-vivid-crimson/10 px-3 py-2 text-xs text-vivid-crimson">
                {error}
              </p>
            )}
            <Button type="submit" disabled={busy} className="w-full py-2 text-sm">
              {busy ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </Panel>
      </div>
    </main>
  );
}
