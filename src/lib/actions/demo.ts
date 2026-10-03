"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DEMO_ACCOUNT_EMAIL, isDemoAccountEmail } from "@/lib/demo/account";
import { DEMO_ACCOUNT_PASSWORD } from "@/lib/demo/credentials";

export async function enterDemoWorkspace(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!isDemoAccountEmail(user?.email)) {
    if (user) {
      await supabase.auth.signOut();
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: DEMO_ACCOUNT_EMAIL,
      password: DEMO_ACCOUNT_PASSWORD,
    });

    if (error) {
      redirect(
        `/login?error=${encodeURIComponent("The sample workspace is unavailable. Try again in a moment.")}`,
      );
    }
  }

  redirect("/pipeline");
}
