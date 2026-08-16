export const DEMO_SLOT_START_HOUR = 9;
export const DEMO_SLOT_END_HOUR = 17;
export const DEMO_SLOT_MINUTES = 30;

const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseDateKey(key: string): Date | null {
  const match = DATE_KEY_PATTERN.exec(key);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function isWeekday(date: Date): boolean {
  const day = date.getDay();
  return day !== 0 && day !== 6;
}

export function isSelectableDemoDate(date: Date, now = new Date()): boolean {
  if (!isWeekday(date)) return false;
  return startOfDay(date).getTime() >= startOfDay(now).getTime();
}

export function listDemoTimeSlots(date: Date, now = new Date()): string[] {
  const slots: string[] = [];

  for (let hour = DEMO_SLOT_START_HOUR; hour < DEMO_SLOT_END_HOUR; hour += 1) {
    for (let minute = 0; minute < 60; minute += DEMO_SLOT_MINUTES) {
      const slot = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        hour,
        minute,
      );
      if (slot.getTime() <= now.getTime()) continue;
      slots.push(
        `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
      );
    }
  }

  return slots;
}

export function isValidTimeValue(time: string): boolean {
  return TIME_PATTERN.test(time);
}

export function isValidDemoSlot(
  dateKey: string,
  time: string,
  now = new Date(),
): boolean {
  const date = parseDateKey(dateKey);
  if (!date || !isValidTimeValue(time)) return false;
  if (!isSelectableDemoDate(date, now)) return false;
  return listDemoTimeSlots(date, now).includes(time);
}

export function listMonthCells(
  year: number,
  month: number,
): Array<{ date: Date; inMonth: boolean } | null> {
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<{ date: Date; inMonth: boolean } | null> = [];

  for (let i = 0; i < first.getDay(); i += 1) {
    cells.push(null);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ date: new Date(year, month, day), inMonth: true });
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}

export function formatTimeLabel(time: string): string {
  const [hourPart, minutePart] = time.split(":");
  const hour = Number(hourPart);
  const minute = Number(minutePart);
  const hour12 = ((hour + 11) % 12) + 1;
  const suffix = hour < 12 ? "AM" : "PM";
  return `${hour12}:${String(minute).padStart(2, "0")} ${suffix}`;
}

export function formatDemoDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}
