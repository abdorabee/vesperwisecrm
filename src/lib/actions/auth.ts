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

const SIGNUPS_PER_HOUR = 10;

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
  const planValue = String(formData.get("plan") ?? "");
  const plan = planValue === "starter" || planValue === "team" ? planValue : null;
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

    if (error || !data?.properties?.hashed_token) {
      redirect(
        `/signup?error=${encodeURIComponent(
          error?.message ?? "Failed to create confirmation link",
        )}${plan ? `&plan=${plan}` : ""}`,
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
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectTo,
        data: { niche },
      },
    });

    if (error) {
      redirect(
        `/signup?error=${encodeURIComponent(error.message)}${plan ? `&plan=${plan}` : ""}`,
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
