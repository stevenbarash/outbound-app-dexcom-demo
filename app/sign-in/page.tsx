/**
 * Sign-in page. Renders the Descope flow web-component.
 *
 * The flow handles all auth UI (email/password, magic link, OTP, social
 * providers, MFA — whatever you've enabled on the flow in the Descope
 * console). On success the SDK writes the DS/DSR cookies and we redirect
 * the user to `/connected`.
 */
'use client';

import { Descope } from '@descope/nextjs-sdk';

export default function SignInPage() {
  return (
    <div>
      <h1>Sign in</h1>
      <p className="lede">Authenticate with Descope, then connect Dexcom.</p>
      <div className="card">
        <Descope
          // The flow ID must match a flow defined in the Descope console.
          // `sign-up-or-in` is one of Descope's prebuilt flows.
          flowId="sign-up-or-in"
          redirectAfterSuccess="/connected"
        />
      </div>
    </div>
  );
}
