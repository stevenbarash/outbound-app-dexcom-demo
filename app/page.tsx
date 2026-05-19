/**
 * Landing page. Public — no auth required.
 * Just explains the demo and links into the sign-in / connected pages.
 */
import Link from 'next/link';

export default function Home() {
  return (
    <div>
      <h1>Descope Outbound App — Dexcom demo</h1>
      <p className="lede">
        Connects an authenticated Descope user to their Dexcom account via
        OAuth, then calls the Dexcom API server-side using the token Descope
        stores for that user.
      </p>
      <div className="row">
        <Link href="/sign-in" className="btn">
          Sign in
        </Link>
        <Link href="/connected" className="btn secondary">
          Already signed in →
        </Link>
      </div>
      <h2>How it works</h2>
      <ol>
        <li>User signs in with Descope.</li>
        <li>
          User clicks <em>Connect Dexcom</em>. Descope drives the OAuth flow.
        </li>
        <li>
          Backend route fetches the stored access token from Descope
          Management API.
        </li>
        <li>
          Backend uses that token to call Dexcom{' '}
          <code>/v3/users/self/egvs</code>.
        </li>
      </ol>
    </div>
  );
}
