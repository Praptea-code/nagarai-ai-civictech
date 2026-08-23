"use client";

import Image from "next/image";
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

  const mobileItemClass =
    "w-full rounded-sm px-2 py-2 text-left text-sm transition-colors duration-150";

  return (
    <header className="bg-signal text-paper">
      <nav className="mx-auto max-w-3xl px-4 py-3 sm:flex sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-6 sm:gap-y-2">
        {/* Mobile-only brand row with hamburger */}
        <div className="flex items-center justify-between gap-4 sm:hidden">
          <Link
            href="/"
            aria-label="Nagar AI"
            className="flex shrink-0 items-center"
          >
            <Image
              src="/nagar-ai-logo.png"
              alt=""
              width={36}
              height={36}
              priority
              className="h-9 w-9"
            />
          </Link>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            className="-mr-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-sm text-paper transition-colors duration-150 hover:bg-white/10"
          >
            {menuOpen ? (
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                className="h-6 w-6"
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
                className="h-6 w-6"
              >
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            )}
          </button>
        </div>

        <Link
          href="/"
          aria-label="Nagar AI"
          className="hidden shrink-0 items-center sm:flex"
        >
          <Image
            src="/nagar-ai-logo.png"
            alt=""
            width={36}
            height={36}
            priority
            className="h-9 w-9"
          />
        </Link>

        <div className="hidden items-center gap-4 sm:flex">
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

        <div className="hidden items-center gap-3 sm:flex">
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
              <Link
                href="/auth/login"
                className="px-1 py-1 text-sm text-paper/80 transition-colors duration-150 hover:text-white"
              >
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

      {menuOpen && (
        <div id="mobile-menu" className="mx-auto max-w-3xl px-4 pb-4 sm:hidden">
          <div className="flex flex-col items-start gap-1 pt-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                aria-current={isActive(link.href) ? "page" : undefined}
                className={`${mobileItemClass} ${
                  isActive(link.href)
                    ? "font-medium text-white underline decoration-hazard decoration-2 underline-offset-4"
                    : "text-paper/80 hover:bg-white/10 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            ))}

            <div className="my-1 h-px w-full bg-white/10" />

            {hasSession ? (
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className={`${mobileItemClass} font-medium text-white hover:bg-white/10 disabled:opacity-50`}
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
                  className={`${mobileItemClass} font-medium text-white hover:bg-white/10`}
                >
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
