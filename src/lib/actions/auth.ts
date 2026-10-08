"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { consumeRateLimit } from "@/lib/rate-limit";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { resolveSafeRedirect } from "@/lib/auth/safe-redirect";
import {
  buildVerificationLink,
  canSendBrandedAuthEmail,
  sendSignupConfirmationEmail,
} from "@/lib/email/auth-emails";
import { signupAgeConfirmed } from "@/lib/auth/signup-age";
import { signupTermsAccepted } from "@/lib/auth/signup-terms";

const SIGNUPS_PER_HOUR = 10;

function signupFailure(message: string, plan: string | null): never {
  redirect(
    `/signup?error=${encodeURIComponent(message)}${plan ? `&plan=${plan}` : ""}`,
  );
}

async function recordSignupAttestations(userId: string): Promise<void> {
  const serviceRole = createServiceRoleClient();
  const { data: membership, error: membershipError } = await serviceRole
    .from("account_members")
    .select("account_id")
    .eq("user_id", userId)
    .eq("role", "owner")
    .limit(1)
    .maybeSingle();

  if (membershipError || !membership) {
    throw new Error(membershipError?.message ?? "Could not record signup attestations");
  }

  const acceptedAt = new Date().toISOString();
  const { error } = await serviceRole
    .from("accounts")
    .update({
      terms_accepted_at: acceptedAt,
      age_confirmed_at: acceptedAt,
    })
    .eq("id", membership.account_id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function signIn(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "");
  const requestOrigin =
    (await headers()).get("origin") ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "http://localhost:3000";
  const safeNext = resolveSafeRedirect(next, requestOrigin);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(
      `/login?error=${encodeURIComponent(error.message)}&next=${encodeURIComponent(safeNext)}`,
    );
  }

  redirect(safeNext);
}

export async function signUp(formData: FormData): Promise<void> {
  const planValue = String(formData.get("plan") ?? "");
  const plan = planValue === "starter" || planValue === "team" ? planValue : null;
  if (!signupTermsAccepted(formData)) {
    signupFailure(
      "Accept the Terms and Privacy notice to create a workspace.",
      plan,
    );
  }
  if (!signupAgeConfirmed(formData)) {
    signupFailure(
      "Confirm that you are 18 or older to create a workspace.",
      plan,
    );
  }

  // Each signup mints a service-role auth link and sends an email. Unthrottled,
  // that is a free bulk-mail primitive attached to our sending domain.
  const withinBudget = await consumeRateLimit({
    scope: "signup",
    identifier: (await headers()).get("x-forwarded-for") ?? "unknown",
    limit: SIGNUPS_PER_HOUR,
    windowSeconds: 3600,
  });
  if (!withinBudget) {
    redirect(
      `/signup?error=${encodeURIComponent("Too many signup attempts. Try again later.")}`,
    );
  }

  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const nicheValue = String(formData.get("niche") ?? "");
  const niche = nicheValue === "agency" ? "agency" : "wholesaler";
  const next = plan ? `/settings/billing?plan=${plan}` : "/pipeline";
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.VERCEL_PROJECT_PRODUCTION_URL ??
    "http://localhost:3000";
  const redirectTo = siteUrl.startsWith("http")
    ? `${siteUrl}/auth/callback?next=${encodeURIComponent(next)}`
    : `https://${siteUrl}/auth/callback?next=${encodeURIComponent(next)}`;

  if (canSendBrandedAuthEmail()) {
    const serviceRole = createServiceRoleClient();
    const { data, error } = await serviceRole.auth.admin.generateLink({
      type: "signup",
      email,
      password,
      options: {
        redirectTo,
        data: {
          app_name: "VesperwiseCRM",
          niche,
        },
      },
    });

    if (error || !data?.properties?.hashed_token || !data.user?.id) {
      signupFailure(
        error?.message ?? "Failed to create confirmation link",
        plan,
      );
    }

    try {
      await recordSignupAttestations(data.user.id);
    } catch (recordError) {
      signupFailure(
        recordError instanceof Error
          ? recordError.message
          : "Could not record signup attestations",
        plan,
      );
    }

    try {
      await sendSignupConfirmationEmail({
        to: email,
        actionLink: buildVerificationLink(
          redirectTo,
          data.properties.hashed_token,
          "signup",
        ),
      });
    } catch (error) {
      redirect(
        `/signup?error=${encodeURIComponent(
          error instanceof Error
            ? error.message
            : "Failed to send confirmation email",
        )}${plan ? `&plan=${plan}` : ""}`,
      );
    }
  } else {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectTo,
        data: { niche },
      },
    });

    if (error || !data.user?.id) {
      signupFailure(error?.message ?? "Could not create the account", plan);
    }

    try {
      await recordSignupAttestations(data.user.id);
    } catch (recordError) {
      signupFailure(
        recordError instanceof Error
          ? recordError.message
          : "Could not record signup attestations",
        plan,
      );
    }
  }

  redirect(
    `/login?message=${encodeURIComponent("Check your email to confirm your account.")}&next=${encodeURIComponent(next)}`,
  );
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
