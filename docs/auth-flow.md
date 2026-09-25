# How Login Works

This app uses **Google OAuth** through **Supabase Auth**, with **Next.js 16** keeping the session in cookies. This document explains the concepts first, then goes through exactly what happens when a user logs in, uses the app and logs out, with links to the code for each step.

---

## 1. The people involved

| Party | Role |
|---|---|
| **Browser** | Where the user clicks buttons. Stores the session cookies. |
| **Next.js server** | Our app code: `proxy.ts`, pages, server actions, route handlers. |
| **Supabase Auth** | The login service. Talks to Google, creates users in `auth.users` and issues tokens. |
| **Google** | Confirms who the user is. It never gives our app the user's Google password. |
| **Supabase Postgres** | Our database. Uses the token to decide which rows a user may access (RLS). |

---

## 2. Concepts you need first

### Authentication and authorization
- **Authentication**: *who are you?* Google and Supabase answer this ("this is ayyan@...").
- **Authorization**: *what are you allowed to do?* Row Level Security (RLS) in Postgres answers this ("you can only see rows where `user_id` is you").

### OAuth ("Login with Google")
OAuth lets one service (Google) vouch for a user to another service (Supabase) **without sharing the password**. The user logs in on Google's own page. Google then tells Supabase "yes, this is the person with email X", and Supabase trusts that. This is why the one-time setup in Google Cloud exists: the **Client ID and Secret** identify *our app* to Google, so Google knows who is asking and where it may send the user back.

### Session
HTTP has no memory: every request is a stranger. A **session** is how the server remembers "this browser belongs to user X" across requests. Here, the session is two tokens stored in cookies.

### Access token (JWT)
A **JSON Web Token** is a signed piece of JSON. Supabase's looks roughly like this:

```json
{
  "sub": "3f1c...-uuid",        // the user's id (same as auth.users.id)
  "email": "ayyan@example.com",
  "role": "authenticated",
  "exp": 1790000000              // expires in ~1 hour
}
```

It is **signed** by Supabase, so nobody can change `sub` to another user's id without breaking the signature. Anyone can *read* a JWT, but only Supabase can *create* a valid one. It is short-lived (1 hour by default) so a stolen token stops working soon.

### Refresh token
A long-lived, single-use token whose only job is to get a **new access token** when the old one expires. That is why users stay logged in for days even though access tokens last an hour.

### Cookies
Small values the browser stores and **sends automatically with every request** to our site. Supabase stores the session in a cookie named `sb-<project-ref>-auth-token`. Large values are split into `...-auth-token.0`, `.1`. Because cookies travel with every request, the *server* can see who is logged in. That is what makes server-side rendering of private data possible.

### PKCE (the one-time `code`)
Google does not send tokens straight to the browser URL, where they could leak through history or logs. Instead Supabase sends back a short-lived **`code`**, and our server swaps it for real tokens. PKCE ("pixy") adds a secret **code verifier**, stored in a cookie before login starts, so that only the browser that *started* the login can finish it. `@supabase/ssr` handles this automatically.

### Row Level Security (RLS)
Postgres rules attached to a table. Every query runs as the logged-in user, and `auth.uid()` returns the `sub` from their JWT. Our policy `using (auth.uid() = user_id)` means a user physically cannot read or change another user's rows, **even if our app code has a bug**.

---

## 3. First login, step by step

```
 Browser              Next.js server            Supabase Auth              Google
    │                       │                         │                       │
 ①  │── click "Continue ───►│                         │                       │
    │    with Google"       │── signInWithOAuth() ───►│                       │
    │                       │◄── Google URL ──────────│                       │
    │◄── redirect + PKCE ───│                         │                       │
    │    verifier cookie    │                         │                       │
 ②  │──────────────────────────────────────────────────────────────────────►│
    │                     user picks account, clicks "Allow"                  │
 ③  │◄─────────────────────────────────────── redirect to Supabase ─────────│
    │──────────────────────────────────────────────►│                       │
    │                                                │── verify with Google ►│
    │                                                │◄── name, email ───────│
    │                                                │  insert auth.users    │
    │                                                │  → trigger inserts    │
    │                                                │    public.profiles    │
    │◄── redirect to /auth/callback?code=abc ────────│                       │
 ④  │── GET /auth/callback ►│                         │                       │
    │                       │── exchangeCodeFor ─────►│                       │
    │                       │   Session(code)         │                       │
    │                       │◄── access + refresh ────│                       │
    │◄── Set-Cookie + ──────│    tokens               │                       │
    │    redirect to /      │                         │                       │
 ⑤  │── GET / (cookies) ───►│  proxy verifies token,  │                       │
    │◄── home page ─────────│  page reads profile     │                       │
```

### ① User clicks "Continue with Google"
[src/app/login/page.tsx](../src/app/login/page.tsx) renders a `<form>` whose action is the server action `signInWithGoogle` in [src/app/login/actions.ts](../src/app/login/actions.ts):

```ts
const { data } = await supabase.auth.signInWithOAuth({
  provider: "google",
  options: { redirectTo: `${origin}/auth/callback` },
});
redirect(data.url); // off to Google
```

Supabase builds the Google login URL. At the same time the Supabase client writes the **PKCE code-verifier cookie**. Then we redirect the browser to Google.

### ② User approves on Google
The user sees Google's own page ("Todo App wants your name and email"). Our app is not involved at all here and never sees the Google password.

### ③ Google → Supabase → user created
Google redirects to `https://<ref>.supabase.co/auth/v1/callback`, the **Authorized redirect URI** registered in Google Cloud. Supabase confirms the result with Google, gets the name and email, and then:

- **First time:** inserts a row into `auth.users`. The database trigger `on_auth_user_created` ([001_profiles.sql](../supabase/migrations/001_profiles.sql)) immediately inserts the matching row into `public.profiles`. **This is the "registration": there is no separate sign-up step.**
- **Returning user:** finds the existing `auth.users` row and updates `last_sign_in_at`.

Supabase then redirects to our `redirectTo` URL with a one-time code: `/auth/callback?code=abc123`. That URL must be listed under **Authentication → URL Configuration → Redirect URLs** in Supabase, or it will refuse.

### ④ Our callback swaps the code for a session
[src/app/auth/callback/route.ts](../src/app/auth/callback/route.ts):

```ts
await supabase.auth.exchangeCodeForSession(code);
return NextResponse.redirect(`${origin}/`);
```

The server sends the `code` plus the PKCE verifier (from the cookie) to Supabase and gets back the **access token and refresh token**. The server Supabase client ([src/lib/supabase/server.ts](../src/lib/supabase/server.ts)) writes them into the `sb-...-auth-token` cookie through its `setAll` function. The user is now logged in.

### ⑤ Home page loads
The browser follows the redirect to `/`, sending the new cookie. The proxy lets the request through (see section 4), and [src/app/page.tsx](../src/app/page.tsx) reads the user's profile:

```ts
const { data: claims } = await supabase.auth.getClaims();   // who is this?
await supabase.from("profiles").select("name, email").eq("id", claims.claims.sub).single();
```

The Supabase client sends the access token with that query, so Postgres knows who is asking and the RLS policy on `profiles` allows the user to read **only their own row**.

---

## 4. Every request after login: the proxy

[src/proxy.ts](../src/proxy.ts) runs **before every page request** (except static files). It calls `updateSession` in [src/lib/supabase/proxy.ts](../src/lib/supabase/proxy.ts), which does three jobs:

1. **Verify the user.** `supabase.auth.getClaims()` checks the access token's signature and expiry.
2. **Refresh when expired.** If the access token has expired but the refresh token is valid, Supabase issues new tokens. `setAll` writes them onto *both* the incoming request (so the page sees the fresh session) and the outgoing response (so the browser stores it). The user never notices.
3. **Guard routes.**
   - Not logged in and not on `/login` or `/auth/*` → redirect to `/login`.
   - Logged in and on `/login` → redirect to `/`.

> **Why is the refresh done in the proxy?** Server Components (pages) are **not allowed to set cookies** in Next.js. That's why `server.ts` has an empty `catch` in `setAll`. The proxy *can* set cookies, so it is the one place where refreshed tokens reliably reach the browser.

> **Next.js 16 note:** this file used to be called `middleware.ts`. Next.js 16 renamed it to `proxy.ts` and the exported function to `proxy`. Older tutorials will still say "middleware".

---

## 5. Signing out

The "Sign out" button in [src/app/page.tsx](../src/app/page.tsx) is a plain form that POSTs to [src/app/auth/signout/route.ts](../src/app/auth/signout/route.ts):

```ts
await supabase.auth.signOut();   // revokes the refresh token at Supabase and clears the cookies
return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
```

It is a **POST**, not a link (GET), so that another website can't log users out just by embedding an image pointing at `/auth/signout`. Status `303` tells the browser to follow the redirect with a GET.

---

## 6. File map

| File | What it does |
|---|---|
| [src/lib/supabase/client.ts](../src/lib/supabase/client.ts) | Supabase client for **browser** code (Client Components). |
| [src/lib/supabase/server.ts](../src/lib/supabase/server.ts) | Supabase client for **server** code. Reads and writes cookies with `next/headers`. |
| [src/lib/supabase/proxy.ts](../src/lib/supabase/proxy.ts) | `updateSession`: verify, refresh, redirect. |
| [src/proxy.ts](../src/proxy.ts) | Runs `updateSession` on every request. |
| [src/app/login/page.tsx](../src/app/login/page.tsx) | Login page with the Google button. |
| [src/app/login/actions.ts](../src/app/login/actions.ts) | Server action that starts the OAuth flow. |
| [src/app/auth/callback/route.ts](../src/app/auth/callback/route.ts) | Swaps the one-time `code` for a session. |
| [src/app/auth/signout/route.ts](../src/app/auth/signout/route.ts) | Ends the session. |
| [supabase/migrations/001_profiles.sql](../supabase/migrations/001_profiles.sql) | `profiles` table, its RLS policies and the auto-create trigger. |
| [.env.local](../.env.local) | Supabase URL and publishable key. **Not committed to git.** |

---

## 7. See it yourself

1. **Cookies:** open DevTools (F12) → **Application** → **Cookies** → `http://localhost:3000`. Look for `sb-<ref>-auth-token`. Delete it and reload: you are sent to `/login`.
2. **Users:** Supabase → **Authentication → Users** shows `auth.users`. Compare the user's id with the `id` in **Table Editor → profiles**. They match.
3. **RLS in action:** in the Supabase SQL Editor, `select * from profiles;` shows every row, because the SQL Editor runs as the admin role and bypasses RLS. In the app, the same table only ever returns your own row.
4. **Watch the redirects:** DevTools → **Network** tab, tick **Preserve log**, then log in. You'll see the chain: `/login` → `accounts.google.com` → `supabase.co/auth/v1/callback` → `/auth/callback?code=...` → `/`.

---

## 8. Common questions

**Is it safe that the publishable key is in the browser?**
Yes. It is *meant* to be public (the `NEXT_PUBLIC_` prefix ships it to the browser). On its own it only gives "anonymous" access, and RLS decides what anyone can actually read or write. The **secret key** (`sb_secret_...`, formerly `service_role`) bypasses RLS: never put it in `NEXT_PUBLIC_` variables or client code.

**Why `getClaims()` and not `getSession()` on the server?**
`getSession()` just reads the cookie and trusts it, and cookies can be forged by the client. `getClaims()` **verifies the JWT signature**, so the user id it returns can be trusted. Use `getClaims()` (or `getUser()`, which asks the Supabase server) whenever a server-side decision depends on who the user is.

**Why is there no password or sign-up form?**
Google does the authentication. The first successful Google login creates the account (`auth.users` + trigger → `profiles`), and later logins reuse it.

**What if the trigger fails?**
The insert into `auth.users` runs in the same transaction as the trigger, so if the trigger errors, the whole sign-up fails and the user sees "Could not sign you in". That keeps `auth.users` and `profiles` in sync.

**What changes in production?**
Add your real domain to Supabase **Redirect URLs** (e.g. `https://myapp.com/auth/callback`) and update **Site URL**. In Google Cloud, **Publish** the app so users other than the listed test users can log in. The Google redirect URI (the Supabase callback) stays the same.
