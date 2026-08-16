"use client";

import { useFormStatus } from "react-dom";

interface AuthSubmitButtonProps {
  idleLabel: string;
  pendingLabel: string;
}

export function AuthSubmitButton({
  idleLabel,
  pendingLabel,
}: AuthSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="flex h-12 w-full items-center justify-center rounded-md border border-[color:var(--mkt-accent)] bg-[var(--mkt-accent)] px-4 text-sm font-semibold text-[var(--mkt-accent-ink)] transition-[background,transform,opacity] duration-150 hover:bg-[var(--mkt-accent-hover)] active:translate-y-px disabled:cursor-wait disabled:opacity-70"
    >
      {pending ? pendingLabel : idleLabel}
    </button>
  );
}
