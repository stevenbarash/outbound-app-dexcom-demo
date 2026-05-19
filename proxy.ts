/**
 * Next.js proxy (middleware) - route authentication gate.
 *
 * Runs on every request matched by `config.matcher` below. For protected
 * routes it checks for a valid Descope session JWT (or, if expired, a valid
 * refresh JWT) in cookies. Missing/invalid → redirects to `/sign-in`.
 *
 * Cookies it reads (set by AuthProvider in app/layout.tsx):
 *   DS  - session JWT  (short-lived, ~10 min)
 *   DSR - refresh JWT  (long-lived, used to mint new session JWTs)
 *
 * File naming note: Next.js 16 renamed `middleware.ts` → `proxy.ts`. The
 * exported function is still the Descope `authMiddleware`.
 */
import { authMiddleware } from '@descope/nextjs-sdk/server';

// Accept either server-only or NEXT_PUBLIC_ env var so a single .env value
// works for both the middleware and the client-side AuthProvider.
const projectId =
  process.env.DESCOPE_PROJECT_ID ||
  process.env.NEXT_PUBLIC_DESCOPE_PROJECT_ID;

if (!projectId) {
  throw new Error(
    'Missing DESCOPE_PROJECT_ID (or NEXT_PUBLIC_DESCOPE_PROJECT_ID) env var',
  );
}

export default authMiddleware({
  projectId,
  // Everything else under `config.matcher` is treated as private.
  publicRoutes: ['/', '/sign-in'],
  // Where to send unauthenticated users.
  redirectUrl: '/sign-in',
});

export const config = {
  // Skip API routes (they do their own auth via `session()`), Next.js
  // internals, and the favicon.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
