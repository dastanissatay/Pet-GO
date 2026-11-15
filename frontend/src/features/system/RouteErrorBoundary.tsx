import { isRouteErrorResponse, Link, useRouteError } from "react-router-dom";
import { MarketingHeader } from "@/components/MarketingHeader";
import { PetAvatar } from "@/components/PetAvatar";
import { Button } from "@/components/ui/button";
import { NotFoundPage } from "@/features/system/NotFoundPage";

/** App-level error boundary: a friendly page instead of a blank screen. */
export function RouteErrorBoundary() {
  const error = useRouteError();
  if (isRouteErrorResponse(error) && error.status === 404) return <NotFoundPage />;

  return (
    <div className="min-h-screen">
      <MarketingHeader />
      <main className="container flex flex-wrap items-center justify-center gap-12 py-16">
        <div className="flex h-[240px] w-[240px] items-center justify-center rounded-full border-2 border-ink bg-surface shadow-hard-lg">
          <PetAvatar species="dog" stage={2} mood="worried" size={170} label={null} />
        </div>
        <div role="alert" className="flex max-w-[520px] flex-1 basis-[360px] flex-col gap-4">
          <h1 className="text-[44px] leading-none sm:text-[52px]">Something went wrong</h1>
          <p className="text-lg">
            This page hit a snag. Reloading usually fixes it, and your data is safe.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <Button variant="primary" size="xl" onClick={() => window.location.reload()}>
              Reload the page
            </Button>
            <Link to="/" className="p-2 font-bold">
              Go home
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
