"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { signIn } from "@/lib/auth";
import { log } from "@/lib/logger";

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
      router.push("/submit");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
      >
        <h1 className="text-xl font-bold">Log in</h1>

        <label className="block text-sm font-medium">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 p-2"
          />
        </label>

        <label className="block text-sm font-medium">
          Password
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 p-2"
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
          className="w-full rounded bg-blue-600 p-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {busy ? "Logging in..." : "Log in"}
        </button>

        <p className="text-sm text-gray-600">
          New here?{" "}
          <a href="/auth/signup" className="text-blue-600 hover:underline">
            Sign up
          </a>
        </p>
      </form>
    </main>
  );
}
