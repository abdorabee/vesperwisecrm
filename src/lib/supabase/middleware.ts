import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/supabase/types";
import { isMarketingPublicPath } from "@/lib/marketing/public-paths";

// /sw.js and /manifest.webmanifest must stay public: browsers fetch them
// without auth cookies-context guarantees, and a redirected service-worker
// script is rejected outright ("behind a redirect, which is disallowed").
const PUBLIC_PATHS = ["/login", "/signup", "/auth", "/offline", "/sw.js", "/manifest.webmanifest", "/api/cron", "/api/dialer/providers/twilio/voice", "/api/leads/intake", "/api/webhooks/dialer", "/api/webhooks/resend-inbound", "/api/webhooks/resend-events", "/api/webhooks/twilio-inbound", "/api/unsubscribe", "/tv/", "/sitemap.xml", "/robots.txt"];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isPublicPath =
    isMarketingPublicPath(pathname) ||
    PUBLIC_PATHS.some((path) => pathname.startsWith(path));

  if (!user && !isPublicPath) {
    // Logged-out visitors hitting the root land on the marketing page;
    // deep links into the app still go to login.
    const target = request.nextUrl.pathname === "/" ? "/home" : "/login";
    return NextResponse.redirect(new URL(target, request.url));
  }

  return response;
}
