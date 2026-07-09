// Startup validation: fail fast on missing required config instead of
// letting every request hit a confusing runtime error deep in a query.
// Optional vars just gate individual features (email, AI, Google, cron) --
// missing ones are logged, not fatal.

const REQUIRED_VARS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

const OPTIONAL_FEATURE_VARS: { key: string; feature: string }[] = [
  { key: "CRON_SECRET", feature: "scheduled sequence/workflow automation" },
  { key: "RESEND_API_KEY", feature: "outbound email" },
  { key: "RESEND_FROM_EMAIL", feature: "outbound email" },
  { key: "ANTHROPIC_API_KEY", feature: "AI paste-to-parse" },
  { key: "TWILIO_ACCOUNT_SID", feature: "outbound SMS" },
  { key: "TWILIO_AUTH_TOKEN", feature: "outbound SMS + inbound SMS webhook" },
  { key: "TWILIO_FROM_NUMBER", feature: "outbound SMS" },
  { key: "GOOGLE_CLIENT_ID", feature: "Google Docs report generation" },
  { key: "GOOGLE_CLIENT_SECRET", feature: "Google Docs report generation" },
];

export function validateEnv(): void {
  const missingRequired = REQUIRED_VARS.filter((key) => !process.env[key]);

  if (missingRequired.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingRequired.join(", ")}`,
    );
  }

  const missingOptional = OPTIONAL_FEATURE_VARS.filter(
    ({ key }) => !process.env[key],
  );

  for (const { key, feature } of missingOptional) {
    console.warn(`[env] ${key} not set — ${feature} is disabled until it's configured.`);
  }
}
