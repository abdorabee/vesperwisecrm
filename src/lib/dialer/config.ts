import "server-only";

export type SupportedDialerProvider = "twilio";

export interface DialerConfig {
  enabled: boolean;
  provider: SupportedDialerProvider;
  publicBaseUrl: string;
  defaultCountry: string;
  maxCallsPerSecond: number;
}

export function isDialerEnabled(): boolean {
  return process.env.DIALER_ENABLED === "true";
}

export function getDialerConfig(): DialerConfig {
  const provider = process.env.DIALER_PROVIDER ?? "twilio";
  if (provider !== "twilio") {
    throw new Error(`Unsupported dialer provider: ${provider}`);
  }

  const publicBaseUrl = process.env.DIALER_PUBLIC_BASE_URL?.replace(/\/$/, "");
  if (!publicBaseUrl) {
    throw new Error("DIALER_PUBLIC_BASE_URL is not configured");
  }
  const maxCallsPerSecond = Number(process.env.DIALER_MAX_CALLS_PER_SECOND ?? 1);
  if (!Number.isInteger(maxCallsPerSecond) || maxCallsPerSecond < 1 || maxCallsPerSecond > 20) {
    throw new Error("DIALER_MAX_CALLS_PER_SECOND must be an integer between 1 and 20");
  }

  return {
    enabled: isDialerEnabled(),
    provider,
    publicBaseUrl,
    defaultCountry: (process.env.DIALER_DEFAULT_COUNTRY ?? "US").toUpperCase(),
    maxCallsPerSecond,
  };
}

export function requireDialerEnabled(): DialerConfig {
  const config = getDialerConfig();
  if (!config.enabled) {
    throw new Error("The dialer is disabled");
  }
  return config;
}
