import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/logo";

export const metadata: Metadata = {
  title: "Privacy Policy · Todo",
};

// Shown to users as the way to reach you about their data.
const CONTACT_EMAIL = "aqdassafwan15@gmail.com";
const LAST_UPDATED = "26 September 2026";

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:py-16">
      <Link href="/" className="inline-flex items-center gap-2.5">
        <Logo />
        <span className="font-semibold tracking-tight">Todo</span>
      </Link>

      <article className="animate-fade-up mt-10 rounded-2xl border border-line bg-surface p-6 backdrop-blur-sm sm:p-10">
        <h1 className="text-3xl font-semibold tracking-tight">Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted">Last updated: {LAST_UPDATED}</p>

        <div className="mt-8 space-y-8 leading-7 text-fg/90 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-fg [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1">
          <section>
            <p>
              Todo is a simple task manager. This page explains what information the app
              collects when you use it, how that information is used, and the choices you have.
            </p>
          </section>

          <section>
            <h2>Information we collect</h2>
            <ul>
              <li>
                <strong>From your Google account:</strong> your name, email address and a unique
                account ID, provided by Google when you choose &quot;Continue with Google&quot;.
                We never see or store your Google password.
              </li>
              <li>
                <strong>Content you create:</strong> the tasks you add, their progress status, and
                when they were created or updated.
              </li>
              <li>
                <strong>Session cookies:</strong> small cookies that keep you signed in. We do not
                use advertising or tracking cookies.
              </li>
            </ul>
          </section>

          <section>
            <h2>How we use it</h2>
            <p>
              Your information is used only to sign you in, show your name in the app, and store
              and display your own tasks. We do not sell your data, share it with advertisers, or
              use it for any other purpose.
            </p>
          </section>

          <section>
            <h2>Where it is stored</h2>
            <p>
              Data is stored with{" "}
              <a href="https://supabase.com/privacy" className="text-violet-300 underline underline-offset-2">
                Supabase
              </a>{" "}
              (database and authentication), and the app is hosted on{" "}
              <a href="https://vercel.com/legal/privacy-policy" className="text-violet-300 underline underline-offset-2">
                Vercel
              </a>
              . Access rules in the database ensure each user can only read and change their own
              tasks.
            </p>
          </section>

          <section>
            <h2>Your choices</h2>
            <ul>
              <li>You can edit or delete any of your tasks at any time inside the app.</li>
              <li>
                To delete your account and all associated data, email{" "}
                <a href={`mailto:${CONTACT_EMAIL}`} className="text-violet-300 underline underline-offset-2">
                  {CONTACT_EMAIL}
                </a>
                .
              </li>
              <li>
                You can revoke the app&apos;s access to your Google account at any time from{" "}
                <a
                  href="https://myaccount.google.com/connections"
                  className="text-violet-300 underline underline-offset-2"
                >
                  your Google account settings
                </a>
                .
              </li>
            </ul>
          </section>

          <section>
            <h2>Changes and contact</h2>
            <p>
              If this policy changes, the date at the top of this page will be updated. Questions?
              Contact{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-violet-300 underline underline-offset-2">
                {CONTACT_EMAIL}
              </a>
              .
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
