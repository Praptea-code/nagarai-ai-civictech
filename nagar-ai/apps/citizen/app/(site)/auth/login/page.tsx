"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { signIn } from "@/lib/auth";
import { log } from "@/lib/logger";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    log("info", "login attempt", { email });
    try {
      const { data, error: err } = await signIn(email, password);
      if (err) {
        setError(err.message);
        log("warn", "login failed", { message: err.message });
        return;
      }
      log("info", "login success", { userId: data.user?.id ?? null });

      // Single login for both roles: admins go to the console,
      // citizens continue with the complaint flow.
      const uid = data.user?.id;
      let role: string | null = null;
      if (uid) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", uid)
          .single();
        role = profile?.role ?? null;
      }

      if (role === "admin") {
        log("info", "admin login, redirecting to console");
        router.push("/admin");
      } else {
        router.push("/submit");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-[70vh] items-center justify-center">
      <form
        onSubmit={handleSubmit}
          className="w-full max-w-sm space-y-4 rounded-md border border-rule bg-white p-8 shadow-sm"
      >
        <h1 className="font-display text-xl font-bold">Log in</h1>

        <label className="block text-sm font-medium">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded border border-rule bg-white p-2 focus:border-signal focus:outline-none focus:ring-1 focus:ring-signal"
          />
        </label>

        <label className="block text-sm font-medium">
          Password
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded border border-rule bg-white p-2 focus:border-signal focus:outline-none focus:ring-1 focus:ring-signal"
          />
        </label>

        {error && (
          <p role="alert" className="rounded bg-red-50 p-2 text-sm text-red-600">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded bg-signal p-2 font-medium text-white transition-colors duration-150 hover:bg-signal-dark disabled:opacity-50"
        >
          {busy ? "Logging in..." : "Log in"}
        </button>

        <p className="text-sm text-gray-600">
          New here?{" "}
          <a href="/auth/signup" className="text-signal hover:underline">
            Sign up
          </a>
        </p>
      </form>
    </main>
  );
}
