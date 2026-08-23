"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { log } from "@/lib/logger";
import { supabase } from "@/lib/supabase";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const uid = data.session?.user.id;
        if (!uid) {
          log("info", "authgate no session, redirecting to login");
          router.replace("/auth/login");
          return;
        }

        // Shared login now: make sure only admins reach the console.
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", uid)
          .single();
        if (profileError || profile?.role !== "admin") {
          log("warn", "authgate non-admin blocked", { uid });
          await supabase.auth.signOut();
          router.replace("/auth/login");
          return;
        }

        setChecked(true);
      } catch {
        router.replace("/auth/login");
      }
    })();
  }, [router]);

  if (!checked) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="font-mono text-xs uppercase tracking-widest text-ink/40">
          Checking session…
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
