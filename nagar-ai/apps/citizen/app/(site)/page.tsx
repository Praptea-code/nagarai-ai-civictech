import Link from "next/link";

export default function Page() {
  return (
    <main className="mx-auto w-full max-w-2xl space-y-6 py-6 text-center sm:py-10">
      <h1 className="font-display text-3xl font-bold text-ink">Nagar AI</h1>
      <p className="text-sm leading-relaxed text-ink/70">
        AI-powered civic issue reporting and resolution system for municipalities.
      </p>
      <div className="mx-auto flex max-w-md flex-col gap-2">
        <Link
          href="/submit"
          className="rounded-md bg-signal p-2 font-medium text-white transition-colors duration-150 hover:bg-signal-dark"
        >
          Report an issue
        </Link>
        <Link
          href="/my-complaints"
          className="rounded-md border border-rule bg-white p-2 font-medium text-ink transition-colors duration-150 hover:border-signal"
        >
          My complaints
        </Link>
      </div>
    </main>
  );
}
