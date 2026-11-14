export function PageLoader({ label = "Loading…" }: { label?: string }) {
  return (
    <div role="status" className="flex min-h-[50vh] items-center justify-center gap-3 font-bold">
      <span className="h-6 w-6 animate-spin rounded-full border-[3px] border-ink border-t-transparent" />
      {label}
    </div>
  );
}
