import { CALLING_TIMEZONE_DATA } from "@/lib/dialer/calling-timezones";

export const CALLING_HOUR_START = 8;
export const CALLING_HOUR_END = 21;

export const OUTSIDE_CALLING_HOURS_MESSAGE =
  "Outside calling hours. Calls are allowed from 8:00 AM until 9:00 PM in the recipient's local time.";

export const UNKNOWN_RECIPIENT_TIME_MESSAGE =
  "Cannot determine the recipient's local time from the area code or ZIP.";

const WINDOW_START_MINUTES = CALLING_HOUR_START * 60;
const WINDOW_END_MINUTES = CALLING_HOUR_END * 60;

const areaCodeZones = new Map<string, string[]>();
for (const [timeZone, codes] of Object.entries(CALLING_TIMEZONE_DATA.areaCodes)) {
  for (const code of codes) {
    const existing = areaCodeZones.get(code);
    if (existing) existing.push(timeZone);
    else areaCodeZones.set(code, [timeZone]);
  }
}

export interface CallingHoursInput {
  phone: string;
  postalCode?: string | null;
  now?: Date;
}

export interface CallingHoursDecision {
  allowed: boolean;
  reason: string | null;
  timeZones: string[];
}

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

export function areaCodeFromPhone(phone: string): string | null {
  const digits = digitsOnly(phone);
  const national =
    digits.length === 11 && digits.startsWith("1")
      ? digits.slice(1)
      : digits.length === 10
        ? digits
        : null;
  if (!national || !/^[2-9]\d{9}$/.test(national)) return null;
  return national.slice(0, 3);
}

function usZip(postalCode: string): string | null {
  const match = postalCode.trim().match(/^(\d{5})(?:-?\d{4})?$/);
  return match?.[1] ?? null;
}

export function timeZoneForPostalCode(postalCode: string | null | undefined): string | null {
  if (!postalCode) return null;
  const digits = usZip(postalCode);
  if (!digits) return null;

  const zip5 = Number(digits);
  let exception: string | null = null;
  for (const [start, end, timeZone] of CALLING_TIMEZONE_DATA.zip5) {
    if (zip5 >= start && zip5 <= end) exception = timeZone;
  }
  if (exception) return exception;

  const zip3 = Number(digits.slice(0, 3));
  let match: string | null = null;
  for (const [start, end, timeZone] of CALLING_TIMEZONE_DATA.zip3) {
    if (zip3 >= start && zip3 <= end) match = timeZone;
  }
  return match;
}

export function recipientTimeZones(phone: string, postalCode?: string | null): string[] {
  const zipZone = timeZoneForPostalCode(postalCode);
  if (zipZone) return [zipZone];
  const areaCode = areaCodeFromPhone(phone);
  if (!areaCode) return [];
  return areaCodeZones.get(areaCode) ?? [];
}

export function localMinutes(now: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  let hour = Number(parts.find((part) => part.type === "hour")?.value);
  const minute = Number(parts.find((part) => part.type === "minute")?.value);
  if (hour === 24) hour = 0;
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) {
    throw new Error(`Unknown time zone: ${timeZone}`);
  }
  return hour * 60 + minute;
}

export function isWithinCallingHours(now: Date, timeZone: string): boolean {
  const minutes = localMinutes(now, timeZone);
  return minutes >= WINDOW_START_MINUTES && minutes < WINDOW_END_MINUTES;
}

export function evaluateCallingHours(input: CallingHoursInput): CallingHoursDecision {
  const now = input.now ?? new Date();
  const timeZones = recipientTimeZones(input.phone, input.postalCode);
  if (timeZones.length === 0) {
    return { allowed: false, reason: UNKNOWN_RECIPIENT_TIME_MESSAGE, timeZones };
  }
  const allowed = timeZones.every((timeZone) => isWithinCallingHours(now, timeZone));
  return {
    allowed,
    reason: allowed ? null : OUTSIDE_CALLING_HOURS_MESSAGE,
    timeZones,
  };
}

export function assertWithinCallingHours(input: CallingHoursInput): void {
  const decision = evaluateCallingHours(input);
  if (!decision.allowed) {
    throw new Error(decision.reason ?? OUTSIDE_CALLING_HOURS_MESSAGE);
  }
}

const OPEN_WINDOW_SAMPLE_PHONES = [
  "+12125550100",
  "+13125550100",
  "+13035550100",
  "+16025550100",
  "+14155550100",
  "+18085550100",
] as const;

export function openCallingHoursPhones(now = new Date()): [string, string] | null {
  const open = OPEN_WINDOW_SAMPLE_PHONES.find(
    (phone) => evaluateCallingHours({ phone, now }).allowed,
  );
  if (!open) return null;
  return [open, `${open.slice(0, -1)}1`];
}
