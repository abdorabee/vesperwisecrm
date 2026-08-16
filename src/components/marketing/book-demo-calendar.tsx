"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import {
  marketingInputClassName,
  marketingLabelClassName,
  marketingTextareaClassName,
} from "@/components/marketing/marketing-fields";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { submitDemoBooking } from "@/lib/actions/marketing-inquiry";
import {
  formatDemoDate,
  formatTimeLabel,
  isSelectableDemoDate,
  listDemoTimeSlots,
  listMonthCells,
  toDateKey,
} from "@/lib/marketing/demo-slots";
import { TEAM_SIZES } from "@/lib/validations/marketing-inquiry";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

const TEAM_SIZE_LABELS: Record<(typeof TEAM_SIZES)[number], string> = {
  solo: "Solo",
  "2-5": "2–5",
  "6-15": "6–15",
  "16+": "16+",
};

interface Confirmation {
  email: string;
  dateLabel: string;
  timeLabel: string;
  timeZone: string;
}

export function BookDemoCalendar() {
  const now = useMemo(() => new Date(), []);
  const [monthCursor, setMonthCursor] = useState(
    () => new Date(now.getFullYear(), now.getMonth(), 1),
  );
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [pending, startTransition] = useTransition();

  const cells = listMonthCells(
    monthCursor.getFullYear(),
    monthCursor.getMonth(),
  );
  const slots = selectedDate ? listDemoTimeSlots(selectedDate, now) : [];
  const monthLabel = monthCursor.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const previousMonth = new Date(
    monthCursor.getFullYear(),
    monthCursor.getMonth() - 1,
    1,
  );
  const canGoBack =
    previousMonth.getFullYear() > now.getFullYear() ||
    (previousMonth.getFullYear() === now.getFullYear() &&
      previousMonth.getMonth() >= now.getMonth());

  if (confirmation) {
    return (
      <div className="rounded-[14px] border border-[color:var(--mkt-border)] bg-[var(--mkt-surface)] p-8 sm:p-10">
        <span className="font-mono text-[10.5px] tracking-[0.1em] text-[var(--mkt-text3)] uppercase">
          Confirmed
        </span>
        <h2 className="mt-4 font-sans text-[clamp(28px,3vw,40px)] leading-[1.05] text-[var(--mkt-text)]">
          We have the slot.
        </h2>
        <p className="mt-4 max-w-[46ch] font-sans text-[15.5px] leading-[1.55] font-light text-[var(--mkt-text2)]">
          {confirmation.dateLabel} at {confirmation.timeLabel} (
          {confirmation.timeZone}). A note will go to {confirmation.email}.
        </p>
      </div>
    );
  }

  return (
    <form
      className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,460px)]"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const timeZone =
          Intl.DateTimeFormat().resolvedOptions().timeZone || "local";

        if (!selectedDate || !selectedTime) {
          setError("Select a weekday and a time slot.");
          return;
        }

        startTransition(async () => {
          setError(null);
          const result = await submitDemoBooking({
            name: String(form.get("name") ?? ""),
            email: String(form.get("email") ?? ""),
            company: String(form.get("company") ?? ""),
            teamSize: String(form.get("teamSize") ?? ""),
            notes: String(form.get("notes") ?? ""),
            website: String(form.get("website") ?? ""),
            dateKey: toDateKey(selectedDate),
            time: selectedTime,
            timeZone,
          });

          if (!result.ok) {
            setError(result.error);
            return;
          }

          setConfirmation({
            email: String(form.get("email") ?? ""),
            dateLabel: formatDemoDate(selectedDate),
            timeLabel: formatTimeLabel(selectedTime),
            timeZone,
          });
        });
      }}
    >
      <div className="rounded-[14px] border border-[color:var(--mkt-border)] bg-[var(--mkt-surface)] p-6 sm:p-8">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" htmlFor="demo-name">
            <Input
              id="demo-name"
              name="name"
              required
              autoComplete="name"
              className={marketingInputClassName}
            />
          </Field>
          <Field label="Work email" htmlFor="demo-email">
            <Input
              id="demo-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className={marketingInputClassName}
            />
          </Field>
          <Field label="Company" htmlFor="demo-company">
            <Input
              id="demo-company"
              name="company"
              required
              autoComplete="organization"
              className={marketingInputClassName}
            />
          </Field>
          <Field label="Team size" htmlFor="demo-team-size">
            <select
              id="demo-team-size"
              name="teamSize"
              required
              defaultValue=""
              className={cn(marketingInputClassName, "w-full appearance-none")}
            >
              <option value="" disabled>
                Select
              </option>
              {TEAM_SIZES.map((size) => (
                <option key={size} value={size}>
                  {TEAM_SIZE_LABELS[size]}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="What should we cover?" htmlFor="demo-notes" className="mt-4">
          <Textarea
            id="demo-notes"
            name="notes"
            rows={4}
            className={marketingTextareaClassName}
          />
        </Field>
        <div className="absolute -left-[9999px]" aria-hidden>
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </div>
        {error ? (
          <p className="mt-4 font-sans text-sm text-red-700 dark:text-red-400">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="mt-6 flex h-12 w-full items-center justify-center rounded-md bg-[var(--mkt-accent)] px-4 font-sans text-sm font-medium text-[var(--mkt-accent-ink)] transition-[background,transform,opacity] duration-150 hover:bg-[var(--mkt-accent-hover)] active:translate-y-px disabled:cursor-wait disabled:opacity-70"
        >
          {pending ? "Sending…" : "Request demo"}
        </button>
      </div>

      <div className="rounded-[14px] border border-[color:var(--mkt-border)] bg-[var(--mkt-surface)] p-6 sm:p-8">
        <div className="flex items-center justify-between">
          <p className="font-mono text-[10.5px] tracking-[0.1em] text-[var(--mkt-text3)] uppercase">
            {monthLabel}
          </p>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() =>
                setMonthCursor(
                  new Date(
                    monthCursor.getFullYear(),
                    monthCursor.getMonth() - 1,
                    1,
                  ),
                )
              }
              disabled={!canGoBack}
              className="rounded-md p-2 text-[var(--mkt-text2)] transition-colors hover:bg-[var(--mkt-bg2)] hover:text-[var(--mkt-text)] disabled:opacity-30"
              aria-label="Previous month"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              onClick={() =>
                setMonthCursor(
                  new Date(
                    monthCursor.getFullYear(),
                    monthCursor.getMonth() + 1,
                    1,
                  ),
                )
              }
              className="rounded-md p-2 text-[var(--mkt-text2)] transition-colors hover:bg-[var(--mkt-bg2)] hover:text-[var(--mkt-text)]"
              aria-label="Next month"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-7 gap-1">
          {WEEKDAYS.map((day) => (
            <span
              key={day}
              className="pb-2 text-center font-mono text-[10px] tracking-[0.08em] text-[var(--mkt-text3)]"
            >
              {day}
            </span>
          ))}
          {cells.map((cell, index) => {
            if (!cell) {
              return <span key={`empty-${index}`} />;
            }

            const selectable = isSelectableDemoDate(cell.date, now);
            const selected =
              selectedDate !== null &&
              toDateKey(selectedDate) === toDateKey(cell.date);

            return (
              <button
                key={toDateKey(cell.date)}
                type="button"
                disabled={!selectable}
                onClick={() => {
                  setSelectedDate(cell.date);
                  setSelectedTime(null);
                }}
                className={cn(
                  "flex aspect-square items-center justify-center rounded-md font-sans text-sm tabular-nums transition-colors",
                  selectable
                    ? "text-[var(--mkt-text)] hover:bg-[var(--mkt-bg2)]"
                    : "text-[var(--mkt-text3)] opacity-40",
                  selected &&
                    "bg-[var(--mkt-accent)] text-[var(--mkt-accent-ink)] hover:bg-[var(--mkt-accent-hover)]",
                )}
              >
                {cell.date.getDate()}
              </button>
            );
          })}
        </div>

        <p className="mt-6 font-mono text-[10.5px] tracking-[0.1em] text-[var(--mkt-text3)] uppercase">
          {selectedDate ? formatDemoDate(selectedDate) : "Select a weekday"}
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {selectedDate && slots.length === 0 ? (
            <p className="col-span-full font-sans text-sm text-[var(--mkt-text2)]">
              No remaining slots today. Pick another weekday.
            </p>
          ) : null}
          {slots.map((slot) => (
            <button
              key={slot}
              type="button"
              onClick={() => setSelectedTime(slot)}
              className={cn(
                "rounded-md border border-[color:var(--mkt-border)] px-2 py-2.5 font-mono text-[11px] tracking-[0.04em] text-[var(--mkt-text2)] transition-colors hover:border-[color:var(--mkt-border-strong)] hover:text-[var(--mkt-text)]",
                selectedTime === slot &&
                  "border-[color:var(--mkt-accent)] bg-[var(--mkt-accent)] text-[var(--mkt-accent-ink)] hover:bg-[var(--mkt-accent-hover)] hover:text-[var(--mkt-accent-ink)]",
              )}
            >
              {formatTimeLabel(slot)}
            </button>
          ))}
        </div>
      </div>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <label htmlFor={htmlFor} className={marketingLabelClassName}>
        {label}
      </label>
      {children}
    </div>
  );
}
