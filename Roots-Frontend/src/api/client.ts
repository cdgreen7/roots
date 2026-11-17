/**
 * Shared request code for talking to the Roots API.
 *
 * Screens call apiRequest instead of fetch, for example:
 *   const plants = await apiRequest<Plant[]>('/plants');
 *   await apiRequest('/actuators', { method: 'POST', body: { plant_id, actuator: 'fan', state: 'on' } });
 *
 * It adds the server address, JSON headers and the login token, gives up after
 * REQUEST_TIMEOUT_MS, and turns failed requests into an ApiError with a readable message.
 */
import { API_URL, REQUEST_TIMEOUT_MS } from './config';

// The login token from /login or /register. Kept in memory for now,
// so users have to log in again after the app restarts.
let authToken: string | null = null;

// setAuthToken saves the token after login. Pass null to log out.
export function setAuthToken(token: string | null) {
  authToken = token;
}

export function getAuthToken() {
  return authToken;
}

// ApiError is thrown for any failed request. status is the HTTP status code,
// or 0 if the server couldn't be reached at all.
export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown; // sent as JSON
  query?: Record<string, string | number | undefined>; // added to the URL, e.g. { plant_id }
};

export async function apiRequest<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, query } = options;

  let url = API_URL + path;
  if (query) {
    const params = Object.entries(query)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
      .join('&');
    if (params) url += `?${params}`;
  }

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch {
    throw new ApiError(
      controller.signal.aborted
        ? 'The server took too long to respond.'
        : 'Could not reach the server. Check your internet connection.',
      0,
    );
  } finally {
    clearTimeout(timer);
  }

  const text = await response.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // Not JSON (for example an error page from the web server); handled below.
  }

  if (!response.ok) {
    throw new ApiError(errorMessage(data, response.status), response.status);
  }
  return data as T;
}

// errorMessage pulls a readable message out of the API's error response.
// The API sends {"detail": "message"}, or for invalid input {"detail": [{"msg": "..."}, ...]}.
function errorMessage(data: unknown, status: number): string {
  const detail = (data as { detail?: unknown } | null)?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    return detail.map((d) => d?.msg ?? String(d)).join('; ');
  }
  return `Request failed (${status})`;
}
