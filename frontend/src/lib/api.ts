import { getDeviceId } from "@/lib/device";

const BASE_URL = (import.meta.env.VITE_API_URL ?? "/api").replace(/\/$/, "");
const TIMEOUT_MS = 30_000;

/** Normalized form of the backend error shape `{"error": {code, message, details}}`. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: Record<string, unknown>;

  constructor(
    status: number,
    code: string,
    message: string,
    details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }

  /**
   * Field errors from a 422, keyed by field name, for react-hook-form.
   * The backend sends a list of `{field, message}`; a `{field: message}` map also works.
   */
  fieldErrors(): Record<string, string> {
    const fields = this.details["fields"];
    const out: Record<string, string> = {};
    if (Array.isArray(fields)) {
      for (const item of fields as unknown[]) {
        if (!isRecord(item)) continue;
        const { field, message } = item;
        if (typeof field === "string" && typeof message === "string" && !(field in out)) {
          out[field] = message;
        }
      }
      return out;
    }
    if (!isRecord(fields)) return out;
    for (const [key, value] of Object.entries(fields)) {
      if (typeof value === "string") out[key] = value;
    }
    return out;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function toApiError(response: Response): Promise<ApiError> {
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    // Non-JSON error bodies (proxy pages) fall through to the generic message.
  }
  const error = isRecord(body) && isRecord(body["error"]) ? body["error"] : null;
  if (error) {
    return new ApiError(
      response.status,
      typeof error["code"] === "string" ? error["code"] : "UNKNOWN_ERROR",
      typeof error["message"] === "string" ? error["message"] : "Something went wrong.",
      isRecord(error["details"]) ? error["details"] : {},
    );
  }
  return new ApiError(response.status, "HTTP_ERROR", "Something went wrong. Try again.");
}

type Method = "GET" | "POST" | "PATCH" | "DELETE";
type Query = Record<string, string | number | boolean | undefined | null>;

interface RequestOptions {
  query?: Query;
  body?: unknown;
  signal?: AbortSignal;
}

function buildUrl(path: string, query?: Query): string {
  const url = `${BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null) params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

async function request<T>(method: Method, path: string, options: RequestOptions = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  options.signal?.addEventListener("abort", () => controller.abort());

  const headers: Record<string, string> = {
    Accept: "application/json",
    "X-Device-Id": getDeviceId(),
  };
  if (options.body !== undefined) headers["Content-Type"] = "application/json";

  let response: Response;
  try {
    response = await fetch(buildUrl(path, options.query), {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
    });
  } catch {
    throw new ApiError(0, "NETWORK_ERROR", "We couldn't reach Pet&GO. Check your connection.");
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) throw await toApiError(response);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

/** The single HTTP client for the app. Features wrap it in TanStack Query hooks. */
export const api = {
  get: <T>(path: string, query?: Query, signal?: AbortSignal) =>
    request<T>("GET", path, { query, signal }),
  post: <T>(path: string, body?: unknown, query?: Query) =>
    request<T>("POST", path, { body, query }),
  patch: <T>(path: string, body: unknown) => request<T>("PATCH", path, { body }),
  delete: <T = void>(path: string, query?: Query) => request<T>("DELETE", path, { query }),
};

export function isApiError(error: unknown, code?: string): error is ApiError {
  return error instanceof ApiError && (code === undefined || error.code === code);
}

export function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : "Something went wrong. Try again.";
}
