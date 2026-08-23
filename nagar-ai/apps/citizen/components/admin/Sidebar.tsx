"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Inbox, LayoutDashboard } from "lucide-react";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/complaints", label: "Complaints", icon: Inbox },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-20 flex w-60 flex-col border-r border-white/10 bg-signal text-paper">
      <div className="flex items-center gap-2.5 border-b border-white/10 px-5 py-5">
        <Image
          src="/nagar-ai-logo.png"
          alt=""
          width={36}
          height={36}
          priority
          className="h-9 w-9"
        />
        <div>
          <p className="font-display text-sm font-bold leading-tight">Nagar AI</p>
          <p className="font-mono text-[10px] uppercase tracking-widest text-paper/50">
            Admin Console
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
          const active = exact
            ? pathname === href
            : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors duration-150 ${
                active
                  ? "bg-white/10 font-medium text-white"
                  : "text-paper/70 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>

      <p className="px-5 pb-4 font-mono text-[10px] uppercase tracking-widest text-paper/30">
        Municipal Ops v0.1
      </p>
    </aside>
  );
}
