"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LogOut, ShieldCheck } from "lucide-react";

import { log } from "@/lib/logger";
import { supabase } from "@/lib/supabase";

export default function Header() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth
      .getUser()
      .then(({ data }) => setEmail(data.user?.email ?? null))
      .catch(() => setEmail(null));
  }, []);

  async function signOut() {
    log("info", "admin signing out");
    await supabase.auth.signOut();
    router.replace("/auth/login");
  }

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-end border-b border-rule bg-white px-6">
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1.5 text-xs text-ink/60">
          <ShieldCheck size={14} className="text-moss" />
          {email ?? "…"}
        </span>
        <button
          onClick={signOut}
          title="Sign out"
          className="flex items-center gap-1.5 rounded-md border border-rule px-2.5 py-1.5 text-xs font-medium transition-colors duration-150 hover:border-signal hover:text-signal"
        >
          <LogOut size={13} />
          Sign out
        </button>
      </div>
    </header>
  );
}
