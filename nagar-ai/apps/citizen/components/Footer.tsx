import Link from "next/link";

const FOOTER_LINKS = [
  { href: "/submit", label: "Report an issue" },
  { href: "/my-complaints", label: "My complaints" },
  { href: "/privacy", label: "Privacy policy" },
];

export default function Footer() {
  return (
    <footer className="border-t border-rule bg-rule/20">
      <div className="mx-auto max-w-3xl px-4 py-8 md:py-10">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <span
              aria-hidden="true"
              className="flex h-9 w-[4.5rem] items-center justify-center rounded-md border border-rule text-[11px] font-medium tracking-[0.2em] text-ink/40"
            >
              LOGO
            </span>
            <p className="mt-3 text-sm leading-relaxed text-ink/70">
              AI-powered civic issue reporting and resolution system for municipalities.
            </p>
          </div>

          <nav aria-label="Footer" className="flex flex-col items-start gap-2 text-sm">
            {FOOTER_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-ink/80 transition-colors duration-150 hover:text-signal hover:underline"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <p className="text-sm leading-relaxed text-ink/70 md:max-w-[16rem]">
            Questions? Contact your municipality&apos;s civic office.
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-1 border-t border-rule pt-6 text-xs text-ink/60 sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; 2026 Nagar AI</p>
          <p>A civic reporting platform connecting residents with their municipality.</p>
        </div>
      </div>
    </footer>
  );
}
