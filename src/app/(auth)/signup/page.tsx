import type { Metadata } from "next";
import Link from "next/link";

import { AuthPage } from "@/components/auth/auth-page";
import { AuthSubmitButton } from "@/components/auth/auth-submit-button";
import { Input } from "@/components/ui/input";
import { signUp } from "@/lib/actions/auth";

export const metadata: Metadata = {
  title: "Create account",
  description: "Create a VesperWise CRM workspace.",
};

interface SignupPageProps {
  searchParams: Promise<{ error?: string; plan?: string }>;
}

const CONTROL_CLASS_NAME =
  "h-12 w-full min-w-0 rounded-md border border-[color:var(--mkt-border)] bg-[var(--mkt-bg)] px-3 text-sm text-[var(--mkt-text)] outline-none transition-colors focus-visible:border-[color:var(--mkt-accent)] focus-visible:ring-3 focus-visible:ring-[color:var(--mkt-accent)]/25 dark:bg-[var(--mkt-bg)]";

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const { error, plan } = await searchParams;
  const selectedPlan = plan === "starter" || plan === "team" ? plan : "";

  return (
    <AuthPage
      eyebrow="Workspace setup / 02"
      narrativeTitle="Give every lead a next step."
      narrativeDescription="Create a workspace for intake, qualification, outreach, ownership, and follow-up."
      formTitle="Create your workspace"
      formDescription="Start with your work email and acquisition model."
      error={error}
    >
      <form action={signUp} className="space-y-5">
        <input type="hidden" name="plan" value={selectedPlan} />
        <div className="space-y-2">
          <label
            htmlFor="signup-email"
            className="font-mono text-[10.5px] font-medium tracking-[0.08em] text-[var(--mkt-text2)] uppercase"
          >
            Work email
          </label>
          <Input
            id="signup-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className={CONTROL_CLASS_NAME}
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="signup-password"
            className="font-mono text-[10.5px] font-medium tracking-[0.08em] text-[var(--mkt-text2)] uppercase"
          >
            Password
          </label>
          <Input
            id="signup-password"
            name="password"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            className={CONTROL_CLASS_NAME}
          />
          <p className="text-xs leading-relaxed text-[var(--mkt-text3)]">
            Use at least 6 characters.
          </p>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="signup-niche"
            className="font-mono text-[10.5px] font-medium tracking-[0.08em] text-[var(--mkt-text2)] uppercase"
          >
            What best describes your business?
          </label>
          <select
            id="signup-niche"
            name="niche"
            defaultValue="wholesaler"
            className={CONTROL_CLASS_NAME}
          >
            <option value="wholesaler">Wholesaler / flipper</option>
            <option value="agency">Cold-calling agency (source for clients)</option>
          </select>
        </div>

        <AuthSubmitButton idleLabel="Create account" pendingLabel="Creating account…" />
      </form>

      <p className="mt-5 text-center text-sm text-[var(--mkt-text2)]">
        Already have a workspace?{" "}
        <Link
          href="/login"
          className="font-medium text-[var(--mkt-text)] underline decoration-[var(--mkt-border-strong)] underline-offset-4 transition-colors hover:decoration-[var(--mkt-accent)]"
        >
          Sign in
        </Link>
      </p>
    </AuthPage>
  );
}
