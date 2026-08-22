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
    <header className="border-b border-gray-200 bg-white">
      <nav className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/" className="text-lg font-bold text-gray-900">
          Nagar AI
        </Link>

        <div className="flex items-center gap-4">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={
                isActive(link.href)
                  ? "rounded bg-blue-50 px-2 py-1 text-sm font-medium text-blue-700"
                  : "px-2 py-1 text-sm text-gray-600 hover:text-gray-900"
              }
              aria-current={isActive(link.href) ? "page" : undefined}
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
              className="rounded border border-gray-300 px-2 py-1 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {loggingOut ? "Logging out..." : "Log out"}
            </button>
          ) : (
            <>
              <Link href="/auth/login" className="px-2 py-1 text-sm text-gray-600 hover:text-gray-900">
                Log in
              </Link>
              <Link
                href="/auth/signup"
                className="rounded border border-gray-300 px-2 py-1 text-sm text-gray-700 hover:bg-gray-50"
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
