"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  canSendBrandedAuthEmail,
  sendSignupConfirmationEmail,
} from "@/lib/email/auth-emails";

export async function signIn(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/pipeline");
}

export async function signUp(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const nicheValue = String(formData.get("niche") ?? "");
  const niche = nicheValue === "agency" ? "agency" : "wholesaler";
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.VERCEL_PROJECT_PRODUCTION_URL ??
    "http://localhost:3000";
  const redirectTo = siteUrl.startsWith("http")
    ? `${siteUrl}/auth/callback`
    : `https://${siteUrl}/auth/callback`;

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

    if (error || !data?.properties?.action_link) {
      redirect(
        `/login?error=${encodeURIComponent(
          error?.message ?? "Failed to create confirmation link",
        )}`,
      );
    }

    try {
      await sendSignupConfirmationEmail({
        to: email,
        actionLink: data.properties.action_link,
      });
    } catch (error) {
      redirect(
        `/login?error=${encodeURIComponent(
          error instanceof Error
            ? error.message
            : "Failed to send confirmation email",
        )}`,
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
      redirect(`/login?error=${encodeURIComponent(error.message)}`);
    }
  }

  redirect(
    `/login?message=${encodeURIComponent("Check your email to confirm your account.")}`,
  );
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
