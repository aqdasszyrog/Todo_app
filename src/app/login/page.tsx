import Link from "next/link";
import { GoogleIcon } from "@/components/ui/icons";
import { Logo } from "@/components/ui/logo";
import { signInWithGoogle } from "@/actions/auth";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error } = await searchParams;

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="animate-fade-up relative w-full max-w-sm">
        {/* Glow behind the card */}
        <div
          aria-hidden
          className="absolute -inset-px rounded-3xl bg-gradient-to-b from-violet-500/40 via-fuchsia-500/10 to-transparent"
        />
        <div className="relative rounded-3xl bg-[#0c0d13]/90 p-7 text-center backdrop-blur-xl sm:p-9">
          <div className="flex justify-center">
            <Logo size="lg" />
          </div>

          <h1 className="mt-6 text-2xl font-semibold tracking-tight sm:text-3xl">
            Welcome to{" "}
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              Todo
            </span>
          </h1>
          <p className="mt-2 text-sm text-muted">
            Plan your day, track progress, get things done.
          </p>

          {error && (
            <p className="animate-fade-up mt-6 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-300">
              {error}
            </p>
          )}

          <form action={signInWithGoogle} className="mt-8">
            <button
              type="submit"
              className="flex h-12 w-full items-center justify-center gap-3 rounded-xl bg-white text-sm font-semibold text-zinc-900 shadow-lg shadow-black/30 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-violet-500/20 active:translate-y-0 active:scale-[0.98]"
            >
              <GoogleIcon className="size-5" />
              Continue with Google
            </button>
          </form>

          <p className="mt-6 text-xs text-muted">
            New here? Signing in creates your account automatically.
          </p>
          <Link
            href="/privacy"
            className="mt-3 inline-block text-xs text-muted underline underline-offset-2 transition hover:text-fg"
          >
            Privacy Policy
          </Link>
        </div>
      </div>
    </main>
  );
}
