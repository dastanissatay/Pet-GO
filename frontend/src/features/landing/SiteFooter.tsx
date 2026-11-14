export function SiteFooter() {
  return (
    <footer className="border-t-2 border-ink bg-surface">
      <div className="container flex flex-wrap justify-between gap-3 py-7 text-sm">
        <span className="font-display text-xl font-extrabold">Pet&amp;GO</span>
        <span className="text-muted">
          Cost information, not veterinary advice. Prices from US sources, linked in the app.
        </span>
      </div>
    </footer>
  );
}
