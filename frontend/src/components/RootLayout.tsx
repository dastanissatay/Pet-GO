import { Suspense } from "react";
import { Outlet, ScrollRestoration } from "react-router-dom";
import { PageLoader } from "@/components/PageLoader";

export function RootLayout() {
  return (
    <>
      <Suspense fallback={<PageLoader />}>
        <Outlet />
      </Suspense>
      <ScrollRestoration />
    </>
  );
}
