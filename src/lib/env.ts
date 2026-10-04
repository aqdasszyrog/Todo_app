// Read once and checked, so a missing variable fails with a clear message at
// startup instead of as a confusing Supabase error on the first request.
// Each `process.env.NEXT_PUBLIC_*` must be written out in full: Next.js only
// inlines them into the browser bundle when referenced literally.

function required(name: string, value: string | undefined) {
  if (!value) throw new Error(`Missing environment variable ${name}. Copy .env.example to .env.local.`);
  return value;
}

export const SUPABASE_URL = required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);

export const SUPABASE_PUBLISHABLE_KEY = required(
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);
