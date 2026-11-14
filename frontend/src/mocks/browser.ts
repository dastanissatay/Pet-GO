import { getResponse } from "msw";
import { handlers } from "@/mocks/handlers";

/**
 * Dev-only mock API. Answers /api requests inside the page by patching fetch.
 *
 * Why not MSW's service worker: the browser stops an idle worker (for example
 * while the tab is in the background), it then forgets this page, and requests
 * fall through to the Vite proxy and fail with ECONNREFUSED.
 */
export async function installMockApi(): Promise<void> {
  // Remove a worker left over from the earlier service-worker setup.
  const registrations = (await navigator.serviceWorker?.getRegistrations()) ?? [];
  await Promise.all(registrations.map((registration) => registration.unregister()));

  const realFetch = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const request = new Request(input, init);
    if (!new URL(request.url).pathname.startsWith("/api/")) return realFetch(input, init);
    const response = await getResponse(handlers, request);
    return response ?? realFetch(input, init);
  };
}
