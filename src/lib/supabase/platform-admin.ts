import { createClient } from "@/lib/supabase/server";

export function getPlatformAdminEmails(): string[] {
  const raw = process.env.PLATFORM_ADMIN_EMAILS ?? "";
  return raw
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isPlatformAdminEmail(email: string | null | undefined): boolean {
  if (!email) {
    return false;
  }
  const allowlist = getPlatformAdminEmails();
  if (allowlist.length === 0) {
    return false;
  }
  return allowlist.includes(email.trim().toLowerCase());
}

export async function requirePlatformAdmin(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email || !isPlatformAdminEmail(user.email)) {
    throw new Error("Platform admin access required");
  }

  return user.id;
}
