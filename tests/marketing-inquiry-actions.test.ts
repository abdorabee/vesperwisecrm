import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  consumeRateLimit: vi.fn(),
  platformClientIp: vi.fn(),
  sendContactInquiryEmail: vi.fn(),
  sendDemoBookingEmail: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("next/headers", () => ({
  headers: async () => ({
    get: () => null,
  }),
}));

vi.mock("@/lib/rate-limit", () => ({
  consumeRateLimit: mocks.consumeRateLimit,
  platformClientIp: mocks.platformClientIp,
}));

vi.mock("@/lib/email/marketing-inquiry", () => ({
  sendContactInquiryEmail: mocks.sendContactInquiryEmail,
  sendDemoBookingEmail: mocks.sendDemoBookingEmail,
}));

import {
  submitContactInquiry,
  submitDemoBooking,
} from "@/lib/actions/marketing-inquiry";

const CLIENT_IP = "198.51.100.10";

const VALID_CONTACT = {
  name: "Jordan Lee",
  email: "jordan@example.com",
  company: "Northwind Acquisitions",
  message: "We want a walkthrough of the queue.",
  website: "",
};

const DEMO_HONEYPOT = {
  name: "Jordan Lee",
  email: "jordan@example.com",
  company: "Northwind Acquisitions",
  teamSize: "2-5",
  dateKey: "not-a-real-date",
  time: "99:99",
  timeZone: "America/New_York",
  website: "https://spam.test",
};

describe("marketing inquiry actions", () => {
  beforeEach(() => {
    mocks.consumeRateLimit.mockReset();
    mocks.platformClientIp.mockReset();
    mocks.sendContactInquiryEmail.mockReset();
    mocks.sendDemoBookingEmail.mockReset();
    mocks.platformClientIp.mockReturnValue(CLIENT_IP);
    mocks.consumeRateLimit.mockResolvedValue(true);
    mocks.sendContactInquiryEmail.mockResolvedValue(undefined);
    mocks.sendDemoBookingEmail.mockResolvedValue(undefined);
  });

  test("returns a schema error for a short contact message without rate limiting or sending", async () => {
    await expect(
      submitContactInquiry({ ...VALID_CONTACT, message: "too short" }),
    ).resolves.toEqual({ ok: false, error: "Tell us a little more" });

    expect(mocks.consumeRateLimit).not.toHaveBeenCalled();
    expect(mocks.sendContactInquiryEmail).not.toHaveBeenCalled();
    expect(mocks.sendDemoBookingEmail).not.toHaveBeenCalled();
  });

  test("returns a schema error for a bad contact email without rate limiting or sending", async () => {
    await expect(
      submitContactInquiry({ ...VALID_CONTACT, email: "not-an-email" }),
    ).resolves.toEqual({ ok: false, error: "Enter a valid work email" });

    expect(mocks.consumeRateLimit).not.toHaveBeenCalled();
    expect(mocks.sendContactInquiryEmail).not.toHaveBeenCalled();
  });

  test("contact honeypot returns ok without rate limiting or sending", async () => {
    await expect(
      submitContactInquiry({
        ...VALID_CONTACT,
        website: "https://spam.test",
      }),
    ).resolves.toEqual({ ok: true });

    expect(mocks.consumeRateLimit).not.toHaveBeenCalled();
    expect(mocks.sendContactInquiryEmail).not.toHaveBeenCalled();
  });

  test("demo honeypot returns ok without rate limiting or sending", async () => {
    await expect(submitDemoBooking(DEMO_HONEYPOT)).resolves.toEqual({
      ok: true,
    });

    expect(mocks.consumeRateLimit).not.toHaveBeenCalled();
    expect(mocks.sendDemoBookingEmail).not.toHaveBeenCalled();
  });

  test("rate-limit false returns too-many without sending", async () => {
    mocks.consumeRateLimit.mockResolvedValue(false);

    await expect(submitContactInquiry(VALID_CONTACT)).resolves.toEqual({
      ok: false,
      error: "Too many requests. Try again later.",
    });

    expect(mocks.consumeRateLimit).toHaveBeenCalledWith({
      scope: "marketing-inquiry",
      identifier: CLIENT_IP,
      limit: 8,
      windowSeconds: 3600,
      failClosed: true,
    });
    expect(mocks.sendContactInquiryEmail).not.toHaveBeenCalled();
  });

  test("contact success sends the parsed inquiry", async () => {
    await expect(submitContactInquiry(VALID_CONTACT)).resolves.toEqual({
      ok: true,
    });

    expect(mocks.sendContactInquiryEmail).toHaveBeenCalledWith(VALID_CONTACT);
    expect(mocks.sendDemoBookingEmail).not.toHaveBeenCalled();
  });

  test("send throw returns a generic error and does not leak the message", async () => {
    mocks.sendContactInquiryEmail.mockRejectedValue(
      new Error("SMTP exploded"),
    );

    await expect(submitContactInquiry(VALID_CONTACT)).resolves.toEqual({
      ok: false,
      error: "Could not send the message. Try again in a few minutes.",
    });

    expect(mocks.sendContactInquiryEmail).toHaveBeenCalledTimes(1);
  });
});

describe("submitDemoBooking with frozen weekday slots", () => {
  const VALID_DEMO = {
    name: "Jordan Lee",
    email: "jordan@example.com",
    company: "Northwind Acquisitions",
    teamSize: "2-5" as const,
    dateKey: "2026-11-25",
    time: "14:30",
    timeZone: "America/New_York",
    website: "",
  };

  beforeEach(() => {
    mocks.consumeRateLimit.mockReset();
    mocks.platformClientIp.mockReset();
    mocks.sendContactInquiryEmail.mockReset();
    mocks.sendDemoBookingEmail.mockReset();
    mocks.platformClientIp.mockReturnValue(CLIENT_IP);
    mocks.consumeRateLimit.mockResolvedValue(true);
    mocks.sendDemoBookingEmail.mockResolvedValue(undefined);
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 10, 25, 14, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("invalid, past, and weekend demo slots return a slot error without rate-limit or send", async () => {
    await expect(
      submitDemoBooking({ ...VALID_DEMO, time: "99:99" }),
    ).resolves.toEqual({
      ok: false,
      error: "Select a weekday time slot in the future.",
    });
    await expect(
      submitDemoBooking({ ...VALID_DEMO, time: "09:00" }),
    ).resolves.toEqual({
      ok: false,
      error: "Select a weekday time slot in the future.",
    });
    await expect(
      submitDemoBooking({ ...VALID_DEMO, dateKey: "2026-11-28" }),
    ).resolves.toEqual({
      ok: false,
      error: "Select a weekday time slot in the future.",
    });

    expect(mocks.consumeRateLimit).not.toHaveBeenCalled();
    expect(mocks.sendDemoBookingEmail).not.toHaveBeenCalled();
  });

  test("a valid weekday future slot rate-limits then sends the parsed booking", async () => {
    await expect(submitDemoBooking(VALID_DEMO)).resolves.toEqual({ ok: true });

    expect(mocks.consumeRateLimit).toHaveBeenCalledWith({
      scope: "marketing-inquiry",
      identifier: CLIENT_IP,
      limit: 8,
      windowSeconds: 3600,
      failClosed: true,
    });
    expect(mocks.sendDemoBookingEmail).toHaveBeenCalledWith({
      ...VALID_DEMO,
      notes: "",
    });
  });

  test("sendDemoBookingEmail throw returns a generic error and does not leak the message", async () => {
    mocks.sendDemoBookingEmail.mockRejectedValue(new Error("SMTP exploded"));

    await expect(submitDemoBooking(VALID_DEMO)).resolves.toEqual({
      ok: false,
      error:
        "Could not send the request. Try again or email us from the contact page.",
    });

    expect(mocks.sendDemoBookingEmail).toHaveBeenCalledTimes(1);
  });
});
