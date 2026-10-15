import { readFileSync } from "node:fs";
import { afterEach, describe, expect, test, vi } from "vitest";
import { CALLING_TIMEZONE_DATA } from "../src/lib/dialer/calling-timezones";
import {
  OUTSIDE_CALLING_HOURS_MESSAGE,
  UNKNOWN_RECIPIENT_TIME_MESSAGE,
  assertWithinCallingHours,
  evaluateCallingHours,
  recipientTimeZones,
} from "../src/lib/dialer/calling-hours";

vi.mock("server-only", () => ({}));

import { getDialerConfig, isDialerEnabled, requireDialerEnabled } from "../src/lib/dialer/config";

const migration = readFileSync(
  "supabase/migrations/20261011140000_dialer_calling_hours.sql",
  "utf8",
);

afterEach(() => {
  vi.unstubAllEnvs();
});

function zones(phone: string, postalCode?: string): string[] {
  return [...recipientTimeZones(phone, postalCode)].sort();
}

describe("recipient time zones", () => {
  test("maps area codes to the predominant zone", () => {
    expect(zones("+12125550100")).toEqual(["America/New_York"]);
    expect(zones("+13125550100")).toEqual(["America/Chicago"]);
    expect(zones("+13035550100")).toEqual(["America/Denver"]);
    expect(zones("+12085550100")).toEqual(["America/Boise"]);
    expect(zones("+16025550100")).toEqual(["America/Phoenix"]);
    expect(zones("+14155550100")).toEqual(["America/Los_Angeles"]);
    expect(zones("+18085550100")).toEqual(["Pacific/Honolulu"]);
    expect(zones("+19075550100")).toEqual(["America/Anchorage"]);
    expect(zones("+18505550100")).toEqual(["America/Chicago"]);
    expect(zones("+19155550100")).toEqual(["America/Denver"]);
    expect(zones("+14165550100")).toEqual(["America/Toronto"]);
    expect(zones("+16045550100")).toEqual(["America/Vancouver"]);
    expect(zones("+13065550100")).toEqual(["America/Regina"]);
  });

  test("keeps split area codes on every zone they cover", () => {
    expect(zones("+18125550100")).toEqual(["America/Chicago", "America/New_York"]);
    expect(zones("+19305550100")).toEqual(["America/Chicago", "America/New_York"]);
    expect(zones("+13085550100")).toEqual(["America/Chicago", "America/Denver"]);
    expect(zones("+16055550100")).toEqual(["America/Chicago", "America/Denver"]);
    expect(zones("+17015550100")).toEqual(["America/Chicago", "America/Denver"]);
    expect(zones("+18675550100")).toEqual(["America/Iqaluit", "America/Whitehorse"]);
  });

  test("prefers a mappable ZIP over the area code", () => {
    expect(zones("+12125550100", "94107")).toEqual(["America/Los_Angeles"]);
    expect(zones("+12125550100", "94107-1234")).toEqual(["America/Los_Angeles"]);
    expect(zones("+14155550100", "10001")).toEqual(["America/New_York"]);
    expect(zones("+16025550100", "79901")).toEqual(["America/Denver"]);
    expect(zones("+12125550100", "85001")).toEqual(["America/Phoenix"]);
    expect(zones("+13125550100", "96815")).toEqual(["Pacific/Honolulu"]);
    expect(zones("+12125550100", "96799")).toEqual(["Pacific/Pago_Pago"]);
    expect(zones("(415) 555-0100", "M5V 2T6")).toEqual(["America/Los_Angeles"]);
  });

  test("lists each area code once per zone and only known IANA names", () => {
    const seen = new Map<string, string[]>();
    for (const [timeZone, codes] of Object.entries(CALLING_TIMEZONE_DATA.areaCodes)) {
      expect(new Set(codes).size).toBe(codes.length);
      expect(() =>
        new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date("2026-07-15T12:00:00Z")),
      ).not.toThrow();
      for (const code of codes) {
        const zonesForCode = seen.get(code) ?? [];
        zonesForCode.push(timeZone);
        seen.set(code, zonesForCode);
      }
    }
    const splits = [...seen.entries()].filter(([, timeZones]) => timeZones.length > 1);
    expect(splits.map(([code]) => code).sort()).toEqual(["308", "605", "701", "812", "867", "930"]);
  });
});

describe("calling hours window", () => {
  test("allows 8:00 AM and rejects 9:00 PM local time", () => {
    const eightAmEastern = new Date("2026-10-11T12:00:00Z");
    const eightFiftyNinePmEastern = new Date("2026-10-11T00:59:00Z");
    const ninePmEastern = new Date("2026-10-11T01:00:00Z");

    expect(evaluateCallingHours({ phone: "+12125550100", now: eightAmEastern }).allowed).toBe(true);
    expect(evaluateCallingHours({ phone: "+12125550100", now: eightFiftyNinePmEastern }).allowed).toBe(true);
    const blocked = evaluateCallingHours({ phone: "+12125550100", now: ninePmEastern });
    expect(blocked.allowed).toBe(false);
    expect(blocked.reason).toBe(OUTSIDE_CALLING_HOURS_MESSAGE);
  });

  test("rejects a call outside the recipient zone even when the agent is inside theirs", () => {
    const morning = new Date("2026-10-11T12:30:00Z");
    expect(evaluateCallingHours({ phone: "+12125550100", now: morning }).allowed).toBe(true);
    expect(evaluateCallingHours({ phone: "+18505550100", now: morning }).allowed).toBe(false);
    expect(evaluateCallingHours({ phone: "+14155550100", now: morning }).allowed).toBe(false);
    expect(evaluateCallingHours({ phone: "+18085550100", now: morning }).allowed).toBe(false);
  });

  test("uses the property ZIP when it disagrees with the area code", () => {
    const morning = new Date("2026-10-11T13:30:00Z");
    expect(evaluateCallingHours({ phone: "+12125550100", now: morning }).allowed).toBe(true);
    expect(
      evaluateCallingHours({ phone: "+12125550100", postalCode: "94107", now: morning }).allowed,
    ).toBe(false);
  });

  test("requires every zone of a split area code to be inside the window", () => {
    const onlyEasternOpen = new Date("2026-10-11T12:30:00Z");
    const bothOpen = new Date("2026-10-11T13:30:00Z");
    expect(evaluateCallingHours({ phone: "+18125550100", now: onlyEasternOpen }).allowed).toBe(false);
    expect(evaluateCallingHours({ phone: "+18125550100", now: bothOpen }).allowed).toBe(true);
  });

  test("keeps Arizona on standard time when Mountain is on daylight time", () => {
    const summerMorning = new Date("2026-07-15T14:30:00Z");
    expect(evaluateCallingHours({ phone: "+13035550100", now: summerMorning }).allowed).toBe(true);
    expect(evaluateCallingHours({ phone: "+16025550100", now: summerMorning }).allowed).toBe(false);
    expect(evaluateCallingHours({ phone: "+16025550100", postalCode: "80202", now: summerMorning }).allowed).toBe(true);
  });

  test("rejects numbers whose local time cannot be derived", () => {
    const decision = evaluateCallingHours({
      phone: "+442071234567",
      now: new Date("2026-10-11T15:00:00Z"),
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe(UNKNOWN_RECIPIENT_TIME_MESSAGE);
    expect(() =>
      assertWithinCallingHours({ phone: "+442071234567", now: new Date("2026-10-11T15:00:00Z") }),
    ).toThrow(UNKNOWN_RECIPIENT_TIME_MESSAGE);
  });

  test("throws the outside-hours message before a call can be reserved", () => {
    expect(() =>
      assertWithinCallingHours({
        phone: "+18085550100",
        now: new Date("2026-10-11T16:00:00Z"),
      }),
    ).toThrow(OUTSIDE_CALLING_HOURS_MESSAGE);
  });
});

describe("calling hours are enforced in prepare_dialer_call", () => {
  test("ships the same timezone data and the same rejection messages", () => {
    const embedded = migration.match(/\$calling_timezones\$(.*?)\$calling_timezones\$/s);
    expect(embedded?.[1]).toBeTruthy();
    expect(JSON.parse(embedded![1])).toEqual(CALLING_TIMEZONE_DATA);
    expect(migration).toContain("perform public.assert_dialer_calling_hours(p_phone_e164, v_postal_code)");
    expect(migration).toContain(OUTSIDE_CALLING_HOURS_MESSAGE.replaceAll("'", "''"));
    expect(migration).toContain(UNKNOWN_RECIPIENT_TIME_MESSAGE.replaceAll("'", "''"));
    expect(migration).toContain("v_minutes < 8 * 60 or v_minutes >= 21 * 60");
    expect(migration).toContain("revoke all on function public.assert_dialer_calling_hours(text, text) from public");
  });
});

describe("dialer environment gates", () => {
  test("stays disabled unless DIALER_ENABLED is true", () => {
    vi.stubEnv("DIALER_ENABLED", "false");
    vi.stubEnv("DIALER_PUBLIC_BASE_URL", "https://www.vesperwisecrm.com");
    expect(isDialerEnabled()).toBe(false);
    expect(() => requireDialerEnabled()).toThrow("The dialer is disabled");
  });

  test("requires DIALER_PUBLIC_BASE_URL when the dialer is enabled", () => {
    vi.stubEnv("DIALER_ENABLED", "true");
    vi.stubEnv("DIALER_PUBLIC_BASE_URL", "");
    expect(() => getDialerConfig()).toThrow("DIALER_PUBLIC_BASE_URL is not configured");

    vi.stubEnv("DIALER_PUBLIC_BASE_URL", "https://www.vesperwisecrm.com/");
    expect(requireDialerEnabled().publicBaseUrl).toBe("https://www.vesperwisecrm.com");
  });
});

describe("reconcile-dialer cron", () => {
  test("is scheduled every minute and no-ops while the dialer is disabled", () => {
    const vercel = JSON.parse(readFileSync("vercel.json", "utf8")) as {
      crons: Array<{ path: string; schedule: string }>;
    };
    expect(vercel.crons).toContainEqual({
      path: "/api/cron/reconcile-dialer",
      schedule: "* * * * *",
    });
    const route = readFileSync("src/app/api/cron/reconcile-dialer/route.ts", "utf8");
    expect(route).toContain("isDialerEnabled()");
    expect(route).toContain("disabled: true");
  });
});
