import path from "path";
import type { NextConfig } from "next";

// Baseline security headers. CSP is report-only for now: the dashboard relies
// on Next's inline bootstrap and inline styles, so enforcing it without first
// collecting reports would break the app. Promote to Content-Security-Policy
// once the report endpoint is quiet.
const CSP_REPORT_ONLY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.twilio.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const SECURITY_HEADERS = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Protects the /tv/<token> display link from leaking via Referer.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "Content-Security-Policy-Report-Only", value: CSP_REPORT_ONLY },
];

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
