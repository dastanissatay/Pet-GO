import { lazy } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { RootLayout } from "@/components/RootLayout";
import { RouteErrorBoundary } from "@/features/system/RouteErrorBoundary";

const LandingPage = lazy(() =>
  import("@/features/landing/LandingPage").then((m) => ({ default: m.LandingPage })),
);
const QuizPage = lazy(() =>
  import("@/features/quiz/QuizPage").then((m) => ({ default: m.QuizPage })),
);
const ResultsPage = lazy(() =>
  import("@/features/results/ResultsPage").then((m) => ({ default: m.ResultsPage })),
);
const DashboardPage = lazy(() =>
  import("@/features/dashboard/DashboardPage").then((m) => ({ default: m.DashboardPage })),
);
const MoneyPage = lazy(() =>
  import("@/features/money/MoneyPage").then((m) => ({ default: m.MoneyPage })),
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
          { path: "/money", element: <MoneyPage /> },
          { path: "/decode", element: <DecodePage /> },
          // The forecast used to be its own page; old links land on Money.
          { path: "/forecast", element: <Navigate to="/money" replace /> },
        ],
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
