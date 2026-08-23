const DISCLAIMER =
  "This is placeholder policy text for development purposes. Replace with legal counsel-reviewed copy before public launch.";

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-2xl">
      <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
        Privacy policy
      </h1>

      <p
        role="note"
        className="mt-4 rounded-lg border border-hazard/40 bg-hazard/10 px-4 py-3 text-sm font-medium leading-relaxed text-ink"
      >
        {DISCLAIMER}
      </p>

      <div className="mt-8 space-y-8 text-sm leading-relaxed text-ink/80">
        <section>
          <h2 className="font-display text-lg font-bold text-ink">What we collect</h2>
          <p className="mt-2">
            Nagar AI collects the minimum information needed to process civic issue
            reports:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              <span className="font-medium text-ink">Account information</span> — your
              email address and full name, handled by Supabase Auth when you create an
              account.
            </li>
            <li>
              <span className="font-medium text-ink">Complaint data</span> — the
              description you write, the category you choose, and the location
              (latitude/longitude) of the issue, either captured automatically from your
              device or entered manually.
            </li>
            <li>
              <span className="font-medium text-ink">Optional details</span> — ward,
              municipality, and up to five photos attached to a report.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-lg font-bold text-ink">How it is used</h2>
          <p className="mt-2">
            Your report is used to route the issue to the relevant municipal department
            and to track its status through to resolution.
          </p>
          <p className="mt-2">
            The description text is also checked against existing reports using an AI
            similarity check, so duplicate reports of the same problem can be linked
            instead of filed twice. This comparison uses only the complaint content you
            submitted.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-bold text-ink">Where it is stored</h2>
          <p className="mt-2">
            All data is stored securely in Supabase. Access is protected by row-level
            security policies: as a citizen, you can only view your own reports, and
            administrative access is limited to authorized municipality staff.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-bold text-ink">Questions</h2>
          <p className="mt-2">
            For questions about your data or this policy, contact your
            municipality&apos;s civic office.
          </p>
        </section>
      </div>
    </main>
  );
}
