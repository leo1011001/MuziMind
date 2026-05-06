/**
 * authFetch — a drop-in replacement for fetch() that adds Bearer token auth.
 *
 * Safari ITP (Intelligent Tracking Prevention) blocks cross-site session cookies
 * when the frontend (muzimind.com) and backend (Railway) are on different domains.
 * To work around this, we store a JWT in localStorage after login and attach it
 * as an Authorization: Bearer header on every request so the server can verify
 * identity without relying on the cookie.
 *
 * The cookie is still sent (credentials: 'include') so desktop browsers that
 * accept cross-site cookies continue to work with zero changes.
 */
export function authFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem('mz_token');

  const headers = new Headers(init.headers ?? {});
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return fetch(input, {
    credentials: 'include', // still send cookie for browsers that allow it
    ...init,
    headers,
  });
}
