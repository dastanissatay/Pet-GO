import { Link } from "react-router-dom";
import { MarketingHeader } from "@/components/MarketingHeader";
import { buttonVariants } from "@/components/ui/button";

export function NotFoundPage() {
  return (
    <div className="min-h-screen">
      <MarketingHeader />
      <main className="container flex flex-wrap items-center justify-center gap-12 py-16">
        <div className="flex flex-col items-center gap-3">
          <p
            aria-hidden="true"
            className="font-display text-[140px] font-extrabold leading-[0.85] tracking-tighter text-coral [-webkit-text-stroke:4px_rgb(var(--ink))] sm:text-[180px]"
          >
            404
          </p>
          <svg width="240" height="130" viewBox="0 0 150 90" aria-hidden="true">
            <path d="M8 80h134" className="stroke-ink" strokeWidth={3} strokeLinecap="round" />
            <circle cx="20" cy="74" r="4" className="fill-ink" />
            <circle cx="34" cy="70" r="4" className="fill-ink" />
            <circle cx="48" cy="74" r="4" className="fill-ink" />
            <ellipse
              cx="95"
              cy="60"
              rx="34"
              ry="16"
              className="fill-fur stroke-ink"
              strokeWidth={2.5}
            />
            <circle cx="62" cy="48" r="17" className="fill-fur stroke-ink" strokeWidth={2.5} />
            <ellipse
              cx="66"
              cy="44"
              rx="7"
              ry="12"
              className="fill-fur-dark stroke-ink"
              strokeWidth={2.5}
            />
            <ellipse
              cx="47"
              cy="56"
              rx="7"
              ry="5"
              className="fill-butter stroke-ink"
              strokeWidth={2.5}
            />
            <circle cx="43" cy="55" r="2.5" className="fill-ink" />
            <path
              d="M128 54q12-12 6-24"
              fill="none"
              className="stroke-ink"
              strokeWidth={3}
              strokeLinecap="round"
            />
            <path
              d="M80 74v8M110 74v8"
              className="stroke-ink"
              strokeWidth={3}
              strokeLinecap="round"
            />
          </svg>
        </div>
        <div className="flex max-w-[480px] flex-1 basis-[340px] flex-col gap-4">
          <h1 className="text-[44px] leading-none sm:text-[52px]">This page wandered off</h1>
          <p className="text-lg">We sniffed around but couldn't find it.</p>
          <div className="flex flex-wrap items-center gap-4">
            <Link to="/" className={buttonVariants({ variant: "primary", size: "xl" })}>
              Go home
            </Link>
            <Link to="/dashboard" className="p-2 font-bold">
              Open my dashboard
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
