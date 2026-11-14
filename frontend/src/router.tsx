import { lazy } from "react";
import { createBrowserRouter } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { RootLayout } from "@/components/RootLayout";
import { RouteErrorBoundary } from "@/features/system/RouteErrorBoundary";

const LandingPage = lazy(() =>
  import("@/features/landing/LandingPage").then((m) => ({ default: m.LandingPage })),
);
const QuizPage = lazy(() => import("@/features/quiz/QuizPage").then((m) => ({ default: m.QuizPage })));
const ResultsPage = lazy(() =>
  import("@/features/results/ResultsPage").then((m) => ({ default: m.ResultsPage })),
);
const DashboardPage = lazy(() =>
  import("@/features/dashboard/DashboardPage").then((m) => ({ default: m.DashboardPage })),
);
const ForecastPage = lazy(() =>
  import("@/features/forecast/ForecastPage").then((m) => ({ default: m.ForecastPage })),
);
const DecodePage = lazy(() =>
  import("@/features/decode/DecodePage").then((m) => ({ default: m.DecodePage })),
);
const NotFoundPage = lazy(() =>
  import("@/features/system/NotFoundPage").then((m) => ({ default: m.NotFoundPage })),
);

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    errorElement: <RouteErrorBoundary />,
    children: [
      { path: "/", element: <LandingPage /> },
      { path: "/quiz", element: <QuizPage /> },
      { path: "/results", element: <ResultsPage /> },
      {
        element: <AppShell />,
        children: [
          { path: "/dashboard", element: <DashboardPage /> },
          { path: "/forecast", element: <ForecastPage /> },
          { path: "/decode", element: <DecodePage /> },
        ],
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
