"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdminAccountId } from "@/lib/supabase/account";
import {
  assertAccountEmailReady,
  formatFromAddress,
  getAccountEmailSettings,
  upsertAccountEmailSettings,
} from "@/lib/email/account-settings";
import {
  createSendingDomain,
  verifySendingDomain,
} from "@/lib/email/resend-domains";
import { getResendClient } from "@/lib/resend/client";
import {
  registerSendingDomainSchema,
  updateEmailIdentitySchema,
  updateReplyRoutingSchema,
  type RegisterSendingDomainInput,
  type UpdateEmailIdentityInput,
  type UpdateReplyRoutingInput,
} from "@/lib/validations/account-email";

function normalizeDomain(domain: string): string {
  return domain
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "");
}

export async function registerSendingDomain(
  input: RegisterSendingDomainInput,
): Promise<void> {
  const data = registerSendingDomainSchema.parse(input);
  const accountId = await requireAdminAccountId();
  const domain = normalizeDomain(data.domain);
  const existing = await getAccountEmailSettings(accountId);

  if (
    existing?.sending_domain === domain &&
    existing.resend_domain_id
  ) {
    return;
  }

  const created = await createSendingDomain(domain);

  await upsertAccountEmailSettings(accountId, {
    sending_domain: domain,
    resend_domain_id: created.id,
    domain_verification_status: created.status,
    from_email:
      existing?.sending_domain === domain ? existing.from_email : null,
    from_name: existing?.from_name ?? null,
  });

  revalidatePath("/settings/email");
}

export async function refreshDomainVerification(): Promise<void> {
  const accountId = await requireAdminAccountId();
  const settings = await getAccountEmailSettings(accountId);

  if (!settings?.resend_domain_id) {
    throw new Error("No sending domain is registered yet");
  }

  const verified = await verifySendingDomain(settings.resend_domain_id);

  await upsertAccountEmailSettings(accountId, {
    domain_verification_status: verified.status,
  });

  revalidatePath("/settings/email");
}

export async function updateEmailIdentity(
  input: UpdateEmailIdentityInput,
): Promise<void> {
  const data = updateEmailIdentitySchema.parse(input);
  const accountId = await requireAdminAccountId();
  const settings = await getAccountEmailSettings(accountId);

  if (!settings?.sending_domain) {
    throw new Error("Register a sending domain before setting a From address");
  }

  const fromEmail = data.fromEmail.trim().toLowerCase();
  const emailDomain = fromEmail.slice(fromEmail.lastIndexOf("@") + 1);

  if (emailDomain !== settings.sending_domain.toLowerCase()) {
    throw new Error(
      `From email must use your sending domain (@${settings.sending_domain})`,
    );
  }

  await upsertAccountEmailSettings(accountId, {
    from_name: data.fromName.trim(),
    from_email: fromEmail,
  });

  revalidatePath("/settings/email");
}

export async function updateReplyRouting(
  input: UpdateReplyRoutingInput,
): Promise<void> {
  const data = updateReplyRoutingSchema.parse(input);
  const accountId = await requireAdminAccountId();
  const settings = await getAccountEmailSettings(accountId);

  if (!settings?.sending_domain) {
    throw new Error("Register a sending domain before configuring reply routing");
  }

  await upsertAccountEmailSettings(accountId, {
    reply_routing_mode: data.replyRoutingMode,
    default_reply_to_email: data.defaultReplyToEmail?.trim() || null,
  });

  revalidatePath("/settings/email");
}

export async function updateCaptureRepliesSetting(enabled: boolean): Promise<void> {
  const accountId = await requireAdminAccountId();
  const settings = await getAccountEmailSettings(accountId);

  if (!settings?.sending_domain) {
    throw new Error("Register a sending domain before configuring reply capture");
  }

  await upsertAccountEmailSettings(accountId, {
    capture_replies_enabled: enabled,
  });

  revalidatePath("/settings/email");
}

export async function sendTestEmail(): Promise<void> {
  const accountId = await requireAdminAccountId();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    throw new Error("Your account has no email address to send a test to");
  }

  const settings = await getAccountEmailSettings(accountId);
  assertAccountEmailReady(settings);
  const from = formatFromAddress(settings);

  const resend = getResendClient();
  const { error: sendError } = await resend.emails.send({
    from,
    to: user.email,
    subject: "VesperwiseCRM test email",
    text: [
      "This is a test email from your VesperwiseCRM account.",
      "",
      `From: ${from}`,
      "",
      "If you received this, your sending domain and From address are configured correctly.",
    ].join("\n"),
  });

  if (sendError) {
    throw new Error(sendError.message);
  }

  await upsertAccountEmailSettings(accountId, {
    last_test_sent_at: new Date().toISOString(),
  });

  revalidatePath("/settings/email");
}
