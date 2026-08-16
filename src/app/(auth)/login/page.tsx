import type { Metadata } from "next";
import Link from "next/link";

import { AuthPage } from "@/components/auth/auth-page";
import { AuthSubmitButton } from "@/components/auth/auth-submit-button";
import { Input } from "@/components/ui/input";
import { signIn } from "@/lib/actions/auth";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your VesperWise CRM workspace.",
};

interface LoginPageProps {
  searchParams: Promise<{ error?: string; message?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error, message } = await searchParams;

  return (
    <AuthPage
      eyebrow="Workspace access / 01"
      narrativeTitle="Pick up where the lead left off."
      narrativeDescription="Open your qualification queue, conversations, pipeline, and next actions in one place."
      formTitle="Welcome back"
      formDescription="Sign in to open your workspace."
      error={error}
      message={message}
    >
      <form action={signIn} className="space-y-5">
        <div className="space-y-2">
          <label
            htmlFor="login-email"
            className="font-mono text-[10.5px] font-medium tracking-[0.08em] text-[var(--mkt-text2)] uppercase"
          >
            Work email
          </label>
          <Input
            id="login-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="h-12 rounded-md border-[color:var(--mkt-border)] bg-[var(--mkt-bg)] px-3 text-[var(--mkt-text)] placeholder:text-[var(--mkt-text3)] focus-visible:border-[color:var(--mkt-accent)] focus-visible:ring-[color:var(--mkt-accent)]/25 dark:bg-[var(--mkt-bg)]"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="login-password"
            className="font-mono text-[10.5px] font-medium tracking-[0.08em] text-[var(--mkt-text2)] uppercase"
          >
            Password
          </label>
          <Input
            id="login-password"
            name="password"
            type="password"
            required
            minLength={6}
            autoComplete="current-password"
            className="h-12 rounded-md border-[color:var(--mkt-border)] bg-[var(--mkt-bg)] px-3 text-[var(--mkt-text)] placeholder:text-[var(--mkt-text3)] focus-visible:border-[color:var(--mkt-accent)] focus-visible:ring-[color:var(--mkt-accent)]/25 dark:bg-[var(--mkt-bg)]"
          />
        </div>

        <AuthSubmitButton idleLabel="Sign in" pendingLabel="Signing in…" />
      </form>

      <p className="mt-5 text-center text-sm text-[var(--mkt-text2)]">
        New to VesperWise?{" "}
        <Link
          href="/signup"
          className="font-medium text-[var(--mkt-text)] underline decoration-[var(--mkt-border-strong)] underline-offset-4 transition-colors hover:decoration-[var(--mkt-accent)]"
        >
          Create an account
        </Link>
      </p>
    </AuthPage>
  );
}
