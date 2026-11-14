import { http, HttpResponse } from "msw";
import { Outlet, Route, Routes } from "react-router-dom";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { DecodeResult, PetRead } from "@/api/contract";
import { DecodePage } from "@/features/decode/DecodePage";
import { SAMPLES } from "@/mocks/db";
import { server } from "@/mocks/server";
import { renderWithProviders } from "@/test/render";

const pet: PetRead = { ...SAMPLES.pet, id: "00000000-0000-4000-8000-000000000123" };

function DecodeRoute() {
  return <Outlet context={pet} />;
}

function renderPage() {
  return renderWithProviders(
    <Routes>
      <Route element={<DecodeRoute />}>
        <Route path="/decode" element={<DecodePage />} />
      </Route>
    </Routes>,
    { route: "/decode" },
  );
}

async function submitEstimate() {
  await userEvent.type(
    screen.getByLabelText(/estimate or treatment plan text/i),
    "Wellness exam $89.00",
  );
  await userEvent.click(screen.getByRole("button", { name: /^decode estimate$/i }));
}

describe("DecodePage", () => {
  it("renders a successful line-by-line decode", async () => {
    const result: DecodeResult = {
      total_charged: "107.00",
      summary: "One line is within the reference range and one has no range.",
      counts: { within: 1, above: 0, below: 0, unknown: 1 },
      lines: [
        {
          raw_text: "Wellness exam $89.00",
          description: "Wellness exam",
          charged: "89.00",
          matched_id: "wellness_exam",
          range: { low: 50, high: 150 },
          verdict: "within",
          explanation: "A routine exam; $89 is within the $50-$150 reference range.",
          question_for_vet: null,
          source_url: "https://example.com/source",
        },
        {
          raw_text: "Biohazard disposal $18.00",
          description: "Biohazard disposal",
          charged: "18.00",
          matched_id: null,
          range: null,
          verdict: "unknown",
          explanation: "We do not have a reference range for this fee.",
          question_for_vet: "Could you explain what is included in this fee?",
          source_url: null,
        },
      ],
    };
    server.use(http.post("*/api/v1/estimates/decode", () => HttpResponse.json(result)));

    renderPage();
    await submitEstimate();

    expect(await screen.findByText(/estimate decoded/i)).toBeInTheDocument();
    expect(screen.getByText("WITHIN")).toBeInTheDocument();
    expect(screen.getByText("NO RANGE")).toBeInTheDocument();
    expect(screen.getByText(/could you explain what is included/i)).toBeInTheDocument();
    expect(screen.getByText(/not veterinary advice/i)).toBeInTheDocument();
  });

  it("shows the no-prices state and says the decode was not used", async () => {
    server.use(
      http.post("*/api/v1/estimates/decode", () =>
        HttpResponse.json(
          { error: { code: "NO_PRICES_FOUND", message: "No priced lines found.", details: {} } },
          { status: 422 },
        ),
      ),
    );

    renderPage();
    await submitEstimate();

    expect(await screen.findByText(/we couldn't find any prices/i)).toBeInTheDocument();
    expect(screen.getByText(/didn't use up your free decode/i)).toBeInTheDocument();
  });

  it("shows the paywall when the free decode is used", async () => {
    server.use(
      http.post("*/api/v1/estimates/decode", () =>
        HttpResponse.json(
          {
            error: {
              code: "DECODE_LIMIT_REACHED",
              message: "Free decode already used.",
              details: {},
            },
          },
          { status: 402 },
        ),
      ),
    );

    renderPage();
    await submitEstimate();

    expect(await screen.findByText(/your free decode is used/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /see upgrade options/i })).toHaveAttribute(
      "href",
      "/results",
    );
  });
});
