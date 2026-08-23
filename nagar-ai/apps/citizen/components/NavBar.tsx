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
  const [menuOpen, setMenuOpen] = useState(false);

  // Re-check on every route change: the layout (and this bar) persists across
  // client-side navigations, so a login/logout inside a page would otherwise
  // leave stale links until a full reload.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(Boolean(data.session));
    });
    setMenuOpen(false);
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

  const brand = (
    <Link
      href="/"
      aria-label="Nagar AI"
      className="flex shrink-0 items-center gap-2"
    >
      <span
        aria-hidden="true"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-signal font-display text-base font-bold leading-none text-paper"
      >
        N
      </span>
      <span className="hidden font-display text-lg font-bold text-paper min-[420px]:inline">
        Nagar AI
      </span>
    </Link>
  );

  const mobileItemClass =
    "rounded-lg px-3 py-2.5 text-sm transition-colors duration-150";

  return (
    <header className="mt-4 flex justify-center px-3 sm:px-4">
      <div className="w-full sm:w-fit">
        <nav
          aria-label="Main"
          className="flex items-center justify-between rounded-full bg-ink px-4 py-2.5 shadow-sm sm:justify-center sm:gap-x-6 sm:px-6 sm:py-3"
        >
          <div className="flex items-center sm:hidden">{brand}</div>

          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            className="-mr-1 flex h-9 w-9 items-center justify-center rounded-full text-paper transition-colors duration-150 hover:bg-white/10 sm:hidden"
          >
            {menuOpen ? (
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                className="h-5 w-5"
              >
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            ) : (
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                className="h-5 w-5"
              >
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            )}
          </button>

          <div className="hidden items-center gap-x-6 sm:flex">
            {brand}

            <div className="flex items-center gap-5">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={isActive(link.href) ? "page" : undefined}
                  className={`whitespace-nowrap text-sm transition-colors duration-150 ${
                    isActive(link.href)
                      ? "font-medium text-white underline decoration-hazard decoration-2 underline-offset-[6px]"
                      : "text-paper/80 hover:text-white"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Lighter inner capsule for auth actions */}
            <div className="flex items-center gap-3 rounded-full bg-paper px-4 py-1.5">
              {hasSession ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="text-sm font-medium text-ink transition-colors duration-150 hover:text-ink/70 disabled:opacity-50"
                >
                  {loggingOut ? "Logging out..." : "Log out"}
                </button>
              ) : (
                <>
                  <Link
                    href="/auth/login"
                    className="text-sm text-ink transition-colors duration-150 hover:text-ink/70"
                  >
                    Log in
                  </Link>
                  <Link
                    href="/auth/signup"
                    className="text-sm font-semibold text-ink transition-colors duration-150 hover:text-ink/70"
                  >
                    Sign up
                  </Link>
                </>
              )}
            </div>
          </div>
        </nav>

        {menuOpen && (
          <div id="mobile-menu" className="mt-2 rounded-2xl bg-ink p-2 shadow-sm sm:hidden">
            <div className="flex flex-col gap-1">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={isActive(link.href) ? "page" : undefined}
                  onClick={() => setMenuOpen(false)}
                  className={`${mobileItemClass} ${
                    isActive(link.href)
                      ? "bg-white/10 font-medium text-white underline decoration-hazard decoration-2 underline-offset-4"
                      : "text-paper/80 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {link.label}
                </Link>
              ))}

              <div className="my-1 border-t border-white/10" />

              {hasSession ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className={`${mobileItemClass} text-left font-medium text-paper/90 hover:bg-white/10 disabled:opacity-50`}
                >
                  {loggingOut ? "Logging out..." : "Log out"}
                </button>
              ) : (
                <>
                  <Link
                    href="/auth/login"
                    onClick={() => setMenuOpen(false)}
                    className={`${mobileItemClass} text-paper/80 hover:bg-white/10 hover:text-white`}
                  >
                    Log in
                  </Link>
                  <Link
                    href="/auth/signup"
                    onClick={() => setMenuOpen(false)}
                    className={`${mobileItemClass} font-semibold text-paper/90 hover:bg-white/10`}
                  >
                    Sign up
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
