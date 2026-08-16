import type { ReactNode } from "react";
import { CircleAlert, CircleCheck, MoveRight } from "lucide-react";

interface AuthPageProps {
  eyebrow: string;
  narrativeTitle: string;
  narrativeDescription: string;
  formTitle: string;
  formDescription: string;
  error?: string;
  message?: string;
  children: ReactNode;
}

const WORKFLOW_STAGES = [
  { label: "Capture", detail: "Calls, forms, imports, and replies" },
  { label: "Qualify", detail: "Context, motivation, owner, and priority" },
  { label: "Act", detail: "Conversation, task, sequence, or next step" },
] as const;

function AuthFeedback({ error, message }: { error?: string; message?: string }) {
  if (!error && !message) return null;

  return (
    <div className="space-y-2">
      {error && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-md border border-destructive/30 bg-destructive/8 px-3 py-2.5 text-sm leading-relaxed text-destructive"
        >
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{error}</span>
        </div>
      )}
      {message && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-start gap-2.5 rounded-md border border-[color:var(--mkt-border)] bg-[var(--mkt-accent-soft)] px-3 py-2.5 text-sm leading-relaxed text-[var(--mkt-text)]"
        >
          <CircleCheck className="mt-0.5 size-4 shrink-0 text-[var(--mkt-text2)]" aria-hidden />
          <span>{message}</span>
        </div>
      )}
    </div>
  );
}

export function AuthPage({
  eyebrow,
  narrativeTitle,
  narrativeDescription,
  formTitle,
  formDescription,
  error,
  message,
  children,
}: AuthPageProps) {
  return (
    <main
      id="auth-main-content"
      className="relative z-10 mx-auto grid w-full max-w-[1240px] flex-1 items-center gap-10 px-4 pt-5 pb-12 sm:px-7 sm:pt-8 sm:pb-16 lg:grid-cols-[minmax(0,1fr)_minmax(360px,480px)] lg:gap-20 lg:pt-10 lg:pb-24"
    >
      <section
        data-auth-panel
        className="mkt-rise order-1 w-full rounded-[14px] border border-[color:var(--mkt-border)] bg-[var(--mkt-surface)] p-5 shadow-[0_30px_90px_color-mix(in_oklch,var(--mkt-text)_10%,transparent)] sm:p-7 lg:order-2"
        aria-labelledby="auth-form-title"
      >
        <div className="mb-6 border-b border-[color:var(--mkt-border-subtle)] pb-5">
          <span className="font-mono text-[10.5px] font-medium tracking-[0.1em] text-[var(--mkt-text3)] uppercase">
            Secure workspace access
          </span>
          <h1
            id="auth-form-title"
            className="mt-3 text-[clamp(1.75rem,5vw,2.25rem)] leading-[1.05] font-normal tracking-[-0.035em] text-balance text-[var(--mkt-text)]"
          >
            {formTitle}
          </h1>
          <p className="mt-2 max-w-[46ch] text-sm leading-relaxed text-[var(--mkt-text2)]">
            {formDescription}
          </p>
        </div>

        <AuthFeedback error={error} message={message} />
        <div className={error || message ? "mt-5" : undefined}>{children}</div>
      </section>

      <aside className="order-2 min-w-0 lg:order-1" aria-labelledby="auth-narrative-title">
        <div className="flex items-center gap-2.5">
          <span className="size-[5px] shrink-0 rounded-full bg-[var(--mkt-accent)]" aria-hidden />
          <span className="font-mono text-[10.5px] font-medium tracking-[0.1em] text-[var(--mkt-text3)] uppercase">
            {eyebrow}
          </span>
        </div>
        <h2
          id="auth-narrative-title"
          className="mt-6 max-w-[14ch] text-[clamp(2.5rem,6vw,4.75rem)] leading-[0.98] font-normal tracking-[-0.045em] text-balance text-[var(--mkt-text)]"
        >
          {narrativeTitle}
        </h2>
        <p className="mt-6 max-w-[48ch] text-base leading-[1.65] font-light text-pretty text-[var(--mkt-text2)] sm:text-lg">
          {narrativeDescription}
        </p>

        <div className="mt-9 max-w-[600px] border-y border-[color:var(--mkt-border-subtle)] py-2">
          <div className="flex items-center justify-between gap-4 py-2 font-mono text-[10px] font-medium tracking-[0.09em] text-[var(--mkt-text3)] uppercase">
            <span>Fig 0.2 — lead workflow</span>
            <span>One workspace</span>
          </div>
          <ol className="grid gap-px overflow-hidden rounded-md border border-[color:var(--mkt-border-subtle)] bg-[var(--mkt-border-subtle)] sm:grid-cols-3">
            {WORKFLOW_STAGES.map((stage, index) => (
              <li key={stage.label} className="min-w-0 bg-[var(--mkt-bg2)] p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[10px] text-[var(--mkt-text3)]">
                    0{index + 1}
                  </span>
                  {index < WORKFLOW_STAGES.length - 1 && (
                    <MoveRight className="size-3.5 text-[var(--mkt-text3)]" aria-hidden />
                  )}
                </div>
                <p className="mt-6 text-sm font-medium text-[var(--mkt-text)]">{stage.label}</p>
                <p className="mt-1 text-xs leading-relaxed text-[var(--mkt-text2)]">
                  {stage.detail}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </aside>
    </main>
  );
}
