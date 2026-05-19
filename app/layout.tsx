/**
 * Root layout. Wraps every page in the Descope `AuthProvider` so client
 * components can use hooks like `useDescope()` / `useSession()` and so the
 * SDK persists the session/refresh JWTs to cookies (which the Next.js proxy
 * in `proxy.ts` reads to gate protected routes).
 */
import type { ReactNode } from 'react';
import { AuthProvider } from '@descope/nextjs-sdk';
import './globals.css';

export const metadata = {
  title: 'Descope Outbound App — Dexcom Demo',
  description: 'OAuth-connect to Dexcom via Descope Outbound Apps',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  // SameSite=Lax is required: after the user consents on Dexcom, the browser
  // is redirected Dexcom → api.descope.com → localhost:3000/connected. With
  // Descope's default of SameSite=Strict the session cookies are dropped on
  // that cross-site bounce and the user lands on /sign-in.
  //
  // `secure` is true everywhere except `next dev`, where the dev server runs
  // on plain HTTP and Secure cookies would be silently refused.
  const cookieConfig = {
    secure: process.env.NODE_ENV !== 'development',
    sameSite: 'Lax' as const,
  };

  return (
    <html lang="en">
      <body>
        <AuthProvider
          projectId={process.env.NEXT_PUBLIC_DESCOPE_PROJECT_ID!}
          sessionTokenViaCookie={cookieConfig}
          refreshTokenViaCookie={cookieConfig}
        >
          <main className="container">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
