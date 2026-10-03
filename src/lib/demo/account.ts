export const DEMO_ACCOUNT_EMAIL = "sample@demo.vesperwisecrm.invalid";

export const DEMO_USER_ID = "d4e00000-0000-4000-8000-000000000001";

export const DEMO_FEATURED_LEAD_ID = "d4e00000-0000-4000-8000-000000000103";

export const DEMO_WRITE_REJECTED_MESSAGE =
  "This is a sample workspace. Create your own workspace to make changes.";

export function isDemoAccountEmail(email: string | null | undefined): boolean {
  return email?.trim().toLowerCase() === DEMO_ACCOUNT_EMAIL;
}
