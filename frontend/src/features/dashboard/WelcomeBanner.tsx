export function WelcomeBanner({ petName }: { petName: string }) {
  return (
    <section className="flex flex-wrap items-center justify-between gap-5 rounded-card bg-ink px-6 py-5 text-surface">
      <div>
        <h1 className="text-[28px] leading-tight text-sun sm:text-[32px]">
          Welcome! {petName}'s plan is ready.
        </h1>
        <p className="mt-1.5">Three things to try first:</p>
      </div>
      <ol className="flex flex-wrap gap-2.5 text-[15px] font-bold">
        <li className="rounded-full bg-surface px-3.5 py-2 text-ink">1 · Do a quest</li>
        <li className="rounded-full bg-surface px-3.5 py-2 text-ink">2 · Log a vet bill</li>
        <li className="rounded-full bg-surface px-3.5 py-2 text-ink">3 · Decode an estimate</li>
      </ol>
    </section>
  );
}
