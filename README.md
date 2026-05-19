# Descope Outbound Apps — Sample App (Dexcom)

A minimal Next.js 16 app that demonstrates **[Descope Outbound Apps]** —
Descope's primitive for managing OAuth connections to third-party
providers on behalf of your signed-in users. This sample uses **Dexcom**
as the provider, but the same code pattern works for any standards-
compliant OAuth2 provider.

[Descope Outbound Apps]: https://docs.descope.com/identity-federation/outbound-apps

---

## What this sample showcases

> **All four steps below are the Outbound Apps surface area** — every
> other file (sign-in flow, session middleware, UI) is incidental Next.js
> plumbing that would look the same regardless of the provider.

| # | Outbound Apps capability                                   | Where it lives in the code                                                                 |
| - | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| 1 | **Start an OAuth connection** from the browser, one call   | `components/ConnectDexcomButton.tsx` → `sdk.outbound.connect("dexcom", { redirectUrl, scopes })` |
| 2 | **Token exchange + storage** handled entirely by Descope   | `https://api.descope.com/v1/outbound/oauth/callback` — no code in this repo                |
| 3 | **Fetch the stored token server-side**, scoped to a user   | `lib/descope-outbound.ts` → `POST /v1/mgmt/outbound/app/user/token`                        |
| 4 | **Auto-refresh** when the token nears expiry               | Handled by Descope on each `getOutboundToken` call — no refresh logic in this repo         |

### Why Outbound Apps instead of DIY OAuth?

| Without Outbound Apps                                       | With Outbound Apps                                                |
| ----------------------------------------------------------- | ----------------------------------------------------------------- |
| Build & host an OAuth callback route                        | Descope hosts the callback (`api.descope.com/v1/outbound/...`)    |
| Build a per-user token table in your DB                     | Descope stores tokens keyed by your Descope user IDs              |
| Build refresh-token plumbing + retry-on-401 logic           | Descope refreshes automatically when you ask for the token        |
| Build a UI flow for the consent round-trip                  | One SDK call: `sdk.outbound.connect(appId, opts)`                 |
| Re-implement per provider                                   | Switch providers by changing the Outbound App config in the console |

---

## File tour

`*` marks files that touch the Outbound Apps API. Everything else is
generic Next.js/Descope-auth scaffolding.

| Path                                  | Role                                                                                          |
| ------------------------------------- | --------------------------------------------------------------------------------------------- |
| `*` `components/ConnectDexcomButton.tsx` | **Outbound Apps — client.** Calls `sdk.outbound.connect("dexcom", ...)` to start OAuth.   |
| `*` `lib/descope-outbound.ts`         | **Outbound Apps — server.** Calls Descope's Management API to fetch the stored access token.  |
| `*` `app/api/dexcom/egvs/route.ts`    | Uses the helper above, then calls the Dexcom API with the token. Shows the end-to-end pattern. |
| `app/layout.tsx`                      | Wraps every page in `AuthProvider`. Configures session/refresh cookies (SameSite=Lax).        |
| `app/page.tsx`                        | Public landing page.                                                                          |
| `app/sign-in/page.tsx`                | Renders the Descope flow web-component for sign-up/in.                                        |
| `app/connected/page.tsx`              | Protected dashboard with the two action cards.                                                |
| `components/GlucosePanel.tsx`         | Calls the backend route, renders Dexcom's JSON response.                                      |
| `proxy.ts`                            | Next.js proxy (formerly `middleware.ts`). Gates protected routes via the Descope session JWT. |

---

## Setup

### 1. Descope project

1. Create a Descope project (or use an existing one).
2. **Project Settings → Project ID** — copy this.
3. **Company Settings → Management Keys → New Key** — copy the value
   (only shown once). The Outbound Apps Management API requires this key.

### 2. Dexcom developer account

1. Register at <https://developer.dexcom.com> and create an app.
2. **Add Redirect URI** — point Dexcom at Descope's hosted callback:
   ```
   https://api.descope.com/v1/outbound/oauth/callback
   ```
   This is the Outbound Apps callback URL. You do **not** host a callback
   in this app.
3. Note the **Client ID** and **Client Secret**.

### 3. Descope Outbound App

This is the Outbound Apps config the demo depends on.

In the Descope console: **Outbound Apps → New App**.

| Field                | Value                                                       |
| -------------------- | ----------------------------------------------------------- |
| Name                 | `Dexcom`                                                    |
| ID                   | `dexcom` (must match `NEXT_PUBLIC_DESCOPE_OUTBOUND_APP_ID`) |
| Client ID            | _(from Dexcom)_                                             |
| Client Secret        | _(from Dexcom)_                                             |
| Authorization Endpoint | `https://sandbox-api.dexcom.com/v2/oauth2/login`          |
| Token Endpoint         | `https://sandbox-api.dexcom.com/v2/oauth2/token`          |
| Scopes                 | `offline_access`                                          |

For production switch the URLs from `sandbox-api.dexcom.com` →
`api.dexcom.com`.

### 4. Environment

Create `.env.local` with:

```env
# Descope project
NEXT_PUBLIC_DESCOPE_PROJECT_ID=P2xxxxxxxxxxxxxxxxxxxxxxxxxxx
DESCOPE_PROJECT_ID=P2xxxxxxxxxxxxxxxxxxxxxxxxxxx
DESCOPE_MANAGEMENT_KEY=K2xxxxxxxxxxxxxxxxxxxxxxxxxxx

# Outbound App
NEXT_PUBLIC_DESCOPE_OUTBOUND_APP_ID=dexcom
DESCOPE_OUTBOUND_APP_ID=dexcom

# Dexcom — sandbox by default
DEXCOM_API_BASE=https://sandbox-api.dexcom.com
```

### 5. Run

```bash
npm install
npm run dev
```

Open <http://localhost:3000>, sign in, click **Connect Dexcom**, and use a
sandbox account (`sandboxuser1@dexcom.com` / `Dexcom123!` through
`sandboxuser6@dexcom.com`).

After consent you'll land on `/connected`; click **Fetch glucose readings**
to call the Dexcom API server-side using the token Descope stored for you.

---

## Key design notes

- **Session cookies use `SameSite=Lax`.** The Outbound Apps OAuth
  round-trip bounces the browser through `api.descope.com`. With Descope's
  default of `SameSite=Strict` the session cookies would be dropped on the
  return navigation, landing the user back at `/sign-in`. See
  `app/layout.tsx`.
- **`outbound.connect()` does not auto-redirect.** It returns an
  authorization URL — the client must call `window.location.assign(url)`.
  See `components/ConnectDexcomButton.tsx`.
- **Tokens never leave the server.** The browser only sees Dexcom's JSON
  response, never the bearer token. The token is pulled from Descope's
  Outbound Apps Management API inside the Next.js route handler.
- **`session()` reads cookies, not headers.** No need for the client to
  send an Authorization header — Descope's `authMiddleware` and `session()`
  both pick up the `DS`/`DSR` cookies automatically.

---

## Adapting to a different provider

The Outbound Apps surface is provider-agnostic. To swap Dexcom for another
OAuth2 provider:

1. Create a new Outbound App in the Descope console with that provider's
   authorize/token URLs and scopes. **No code changes** to the Outbound
   Apps callback — Descope hosts it.
2. Update `NEXT_PUBLIC_DESCOPE_OUTBOUND_APP_ID` /
   `DESCOPE_OUTBOUND_APP_ID` in your env.
3. Update the `scopes` array in `components/ConnectDexcomButton.tsx`.
4. Replace `app/api/dexcom/egvs/route.ts` with a route that calls the new
   provider's API.

Everything else (sign-in flow, session handling, the Outbound Apps
Management API call to fetch the stored token) stays identical.
