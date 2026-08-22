"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { signOut } from "@/lib/auth";
import { log } from "@/lib/logger";
import { supabase } from "@/lib/supabase";

const NAV_LINKS = [
  { href: "/submit", label: "Report an issue" },
  { href: "/my-complaints", label: "My complaints" },
];

export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [hasSession, setHasSession] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Re-check on every route change: the layout (and this bar) persists across
  // client-side navigations, so a login/logout inside a page would otherwise
  // leave stale links until a full reload.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(Boolean(data.session));
    });
  }, [pathname]);

  const handleLogout = useCallback(async () => {
    setLoggingOut(true);
    try {
      const res = await signOut();
      if (res.error) {
        log("warn", "navbar logout rejected", { message: res.error.message });
        return;
      }
      log("info", "navbar logout success");
      router.push("/auth/login");
    } catch (err) {
      log("error", "navbar logout failed", { message: String(err) });
    } finally {
      setLoggingOut(false);
    }
  }, [router]);

  const isActive = (href: string) =>
    pathname === href || pathname?.startsWith(`${href}/`) === true;

  return (
    <header className="bg-signal text-paper">
      <nav className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/" className="font-display text-lg font-bold text-white transition-colors duration-150 hover:text-paper/90">
          Nagar AI
        </Link>

        <div className="flex items-center gap-4">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive(link.href) ? "page" : undefined}
              className={`text-sm transition-colors duration-150 ${
                isActive(link.href)
                  ? "font-medium text-white underline decoration-hazard decoration-2 underline-offset-[6px]"
                  : "text-paper/80 hover:text-white"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {hasSession ? (
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="rounded-sm border border-paper/50 px-2 py-1 text-sm text-paper transition-colors duration-150 hover:bg-white/10 disabled:opacity-50"
            >
              {loggingOut ? "Logging out..." : "Log out"}
            </button>
          ) : (
            <>
              <Link href="/auth/login" className="px-1 py-1 text-sm text-paper/80 transition-colors duration-150 hover:text-white">
                Log in
              </Link>
              <Link
                href="/auth/signup"
                className="rounded-sm border border-paper/50 px-2 py-1 text-sm text-paper transition-colors duration-150 hover:bg-white/10"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
