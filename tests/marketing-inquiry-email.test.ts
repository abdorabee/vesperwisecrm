import { beforeEach, describe, expect, test, vi } from "vitest";

const send = vi.hoisted(() => vi.fn());

vi.mock("@/lib/resend/client", () => ({
  getResendClient: () => ({ emails: { send } }),
}));

import {
  canSendInquiryEmail,
  sendContactInquiryEmail,
  sendDemoBookingEmail,
} from "@/lib/email/marketing-inquiry";
import type {
  ContactInquiryInput,
  DemoBookingInput,
} from "@/lib/validations/marketing-inquiry";

const booking: DemoBookingInput = {
  name: "Jordan Lee",
  email: "jordan@example.com",
  company: "Northwind Acquisitions",
  teamSize: "2-5",
  notes: "Show the dialer",
  dateKey: "2026-08-17",
  time: "09:00",
  timeZone: "America/Indiana/Indianapolis",
  website: "",
};

const contact: ContactInquiryInput = {
  name: "Jordan Lee",
  email: "jordan@example.com",
  company: "Northwind Acquisitions",
  message: "We want a walkthrough of the queue.",
  website: "",
};

function enableDelivery() {
  process.env.RESEND_API_KEY = "re_test";
  process.env.RESEND_FROM_EMAIL = "hello@vesperwise.test";
  process.env.DEMO_INBOX_EMAIL = "inbox@vesperwise.test";
}

describe("demo and contact inquiry email", () => {
  beforeEach(() => {
    send.mockReset();
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_FROM_EMAIL;
    delete process.env.DEMO_INBOX_EMAIL;
  });

  test("does not send without RESEND_API_KEY", async () => {
    expect(canSendInquiryEmail()).toBe(false);
    await sendDemoBookingEmail(booking);
    await sendContactInquiryEmail(contact);
    expect(send).not.toHaveBeenCalled();
  });

  test("uses production From and inbox defaults when only the API key is set", async () => {
    process.env.RESEND_API_KEY = "re_test";
    send.mockResolvedValue({ error: null });

    expect(canSendInquiryEmail()).toBe(true);
    await sendDemoBookingEmail(booking);

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "VesperWise <onboarding@resend.dev>",
        to: "abdorabee1134@gmail.com",
        replyTo: "jordan@example.com",
      }),
    );
  });

  test("sends a demo request to DEMO_INBOX_EMAIL", async () => {
    enableDelivery();
    send.mockResolvedValue({ error: null });

    expect(canSendInquiryEmail()).toBe(true);
    await sendDemoBookingEmail(booking);

    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "VesperWise <hello@vesperwise.test>",
        to: "inbox@vesperwise.test",
        replyTo: "jordan@example.com",
        subject: "Demo request — Northwind Acquisitions",
      }),
    );
    const payload = send.mock.calls[0][0] as { text: string };
    expect(payload.text).toContain("Jordan Lee");
    expect(payload.text).toContain("Monday, August 17");
    expect(payload.text).toContain("9:00 AM");
    expect(payload.text).toContain("Show the dialer");
  });

  test("sends a contact message to DEMO_INBOX_EMAIL", async () => {
    enableDelivery();
    send.mockResolvedValue({ error: null });

    await sendContactInquiryEmail(contact);

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "VesperWise <hello@vesperwise.test>",
        to: "inbox@vesperwise.test",
        replyTo: "jordan@example.com",
        subject: "Contact — Northwind Acquisitions",
      }),
    );
    const payload = send.mock.calls[0][0] as { text: string };
    expect(payload.text).toContain("We want a walkthrough of the queue.");
  });

  test("throws when Resend returns an error", async () => {
    enableDelivery();
    send.mockResolvedValue({ error: { message: "domain not verified" } });

    await expect(sendDemoBookingEmail(booking)).rejects.toThrow(
      "domain not verified",
    );
  });
});
