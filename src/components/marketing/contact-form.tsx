"use client";

import { useState, useTransition, type ReactNode } from "react";

import {
  marketingInputClassName,
  marketingLabelClassName,
  marketingTextareaClassName,
} from "@/components/marketing/marketing-fields";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { submitContactInquiry } from "@/lib/actions/marketing-inquiry";

export function ContactForm() {
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();

  if (sent) {
    return (
      <div className="max-w-[560px] rounded-[14px] border border-[color:var(--mkt-border)] bg-[var(--mkt-surface)] p-8">
        <span className="font-mono text-[10.5px] tracking-[0.1em] text-[var(--mkt-text3)] uppercase">
          Sent
        </span>
        <h2 className="mt-4 font-sans text-2xl text-[var(--mkt-text)]">
          Message received.
        </h2>
        <p className="mt-3 font-sans text-[15px] leading-6 font-light text-[var(--mkt-text2)]">
          We will reply to the work email you entered.
        </p>
      </div>
    );
  }

  return (
    <form
      className="relative max-w-[560px] space-y-4 rounded-[14px] border border-[color:var(--mkt-border)] bg-[var(--mkt-surface)] p-6 sm:p-8"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        startTransition(async () => {
          setError(null);
          const result = await submitContactInquiry({
            name: String(form.get("name") ?? ""),
            email: String(form.get("email") ?? ""),
            company: String(form.get("company") ?? ""),
            message: String(form.get("message") ?? ""),
            website: String(form.get("website") ?? ""),
          });
          if (!result.ok) {
            setError(result.error);
            return;
          }
          setSent(true);
        });
      }}
    >
      <Field label="Name" htmlFor="contact-name">
        <Input
          id="contact-name"
          name="name"
          required
          autoComplete="name"
          className={marketingInputClassName}
        />
      </Field>
      <Field label="Work email" htmlFor="contact-email">
        <Input
          id="contact-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className={marketingInputClassName}
        />
      </Field>
      <Field label="Company" htmlFor="contact-company">
        <Input
          id="contact-company"
          name="company"
          required
          autoComplete="organization"
          className={marketingInputClassName}
        />
      </Field>
      <Field label="Message" htmlFor="contact-message">
        <Textarea
          id="contact-message"
          name="message"
          required
          minLength={10}
          rows={5}
          className={marketingTextareaClassName}
        />
      </Field>
      <div className="absolute -left-[9999px]" aria-hidden>
        <input type="text" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      {error ? (
        <p className="font-sans text-sm text-red-700 dark:text-red-400">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="flex h-12 w-full items-center justify-center rounded-md bg-[var(--mkt-accent)] px-4 font-sans text-sm font-medium text-[var(--mkt-accent-ink)] transition-[background,opacity] duration-150 hover:bg-[var(--mkt-accent-hover)] disabled:cursor-wait disabled:opacity-70"
      >
        {pending ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={htmlFor} className={marketingLabelClassName}>
        {label}
      </label>
      {children}
    </div>
  );
}
