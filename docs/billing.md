# Plans and billing

Every user is on one of two plans, stored in `profiles.plan`:

- **Basic** (free): the default. Everyone who signed up before plans existed is on Basic.
- **Premium** (paid monthly through Stripe): adds the in-app AI assistant (to be built with n8n). Check it with `isPremium(plan)` from `src/lib/plans.ts`.

## How an upgrade works

1. On `/plans` the user clicks **Upgrade to Premium**. `startPremiumCheckout` (`src/actions/billing.ts`) creates a Stripe customer for them the first time, saves its id on their profile, and redirects to Stripe Checkout.
2. They pay on Stripe's page and come back to `/plans?checkout=success&session_id=…`. The page asks Stripe for that checkout and updates their plan straight away.
3. Separately, Stripe calls `POST /api/stripe/webhook`. Renewals, failed payments and cancellations made later in the Customer Portal all arrive this way.

Both steps 2 and 3 call `syncStripeCustomer()` (`src/lib/billing/sync.ts`), which reads the customer's current subscriptions from Stripe and writes the result to the profile. Stripe is the source of truth; the profile is a copy of it.

**Manage billing** opens Stripe's Customer Portal, where users change their card, download invoices or cancel. A cancelled subscription stays Premium until the end of the paid period.

## Who can change the plan

Users can update their own profile row, but migration 013 limits that to `name` and `phone`. The plan and Stripe columns are written only by the server with `SUPABASE_SECRET_KEY` (`src/lib/supabase/admin.ts`), and only after Stripe confirms. `supabase/tests/plans.test.sql` checks this.

## Testing locally

Install the [Stripe CLI](https://docs.stripe.com/stripe-cli), then forward webhooks to the dev server:

```bash
stripe login
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Put the `whsec_…` it prints into `STRIPE_WEBHOOK_SECRET` in `.env.local` and restart `npm run dev`. Pay with the test card `4242 4242 4242 4242`, any future expiry date and any CVC.
