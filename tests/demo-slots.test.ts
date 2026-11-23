import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  formatTimeLabel,
  isSelectableDemoDate,
  isValidDemoSlot,
  isWeekday,
  listDemoTimeSlots,
  parseDateKey,
} from "@/lib/marketing/demo-slots";

describe("demo slots", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 10, 25, 14, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("parseDateKey rejects malformed, Feb 31, and month 13, and accepts 2026-11-25", () => {
    expect(parseDateKey("2026/11/25")).toBeNull();
    expect(parseDateKey("11-25-2026")).toBeNull();
    expect(parseDateKey("2026-11")).toBeNull();
    expect(parseDateKey("2026-02-31")).toBeNull();
    expect(parseDateKey("2026-13-01")).toBeNull();

    const parsed = parseDateKey("2026-11-25");
    expect(parsed).toBeInstanceOf(Date);
    expect(parsed?.getFullYear()).toBe(2026);
    expect(parsed?.getMonth()).toBe(10);
    expect(parsed?.getDate()).toBe(25);
  });

  test("isWeekday is false for Saturday and Sunday and true for Wednesday Nov 25 2026", () => {
    expect(isWeekday(new Date(2026, 10, 28))).toBe(false);
    expect(isWeekday(new Date(2026, 10, 29))).toBe(false);
    expect(isWeekday(new Date(2026, 10, 25))).toBe(true);
  });

  test("isSelectableDemoDate rejects weekends and yesterday, and allows today and tomorrow weekdays", () => {
    expect(isSelectableDemoDate(new Date(2026, 10, 28))).toBe(false);
    expect(isSelectableDemoDate(new Date(2026, 10, 29))).toBe(false);
    expect(isSelectableDemoDate(new Date(2026, 10, 24))).toBe(false);
    expect(isSelectableDemoDate(new Date(2026, 10, 25))).toBe(true);
    expect(isSelectableDemoDate(new Date(2026, 10, 26))).toBe(true);
  });

  test("listDemoTimeSlots on a frozen 14:00 Wednesday keeps later afternoon slots only", () => {
    const slots = listDemoTimeSlots(new Date(2026, 10, 25));

    expect(slots).toContain("14:30");
    expect(slots).toContain("16:30");
    expect(slots).not.toContain("14:00");
    expect(slots).not.toContain("13:30");
    expect(slots).not.toContain("09:00");
    expect(slots).not.toContain("17:00");
  });

  test("isValidDemoSlot accepts a future weekday slot and rejects weekend, past, and invalid values", () => {
    expect(isValidDemoSlot("2026-11-25", "14:30")).toBe(true);
    expect(isValidDemoSlot("2026-11-28", "14:30")).toBe(false);
    expect(isValidDemoSlot("2026-11-25", "09:00")).toBe(false);
    expect(isValidDemoSlot("2026-11-25", "99:99")).toBe(false);
    expect(isValidDemoSlot("2026-13-01", "14:30")).toBe(false);
  });

  test("formatTimeLabel renders 12-hour labels", () => {
    expect(formatTimeLabel("09:00")).toBe("9:00 AM");
    expect(formatTimeLabel("14:30")).toBe("2:30 PM");
  });
});
