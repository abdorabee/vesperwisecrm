import type { MetadataRoute } from "next";

import { MARKETING_PUBLIC_PATHS } from "@/lib/marketing/public-paths";
import { publicSiteOrigin } from "@/lib/marketing/site-url";

const SITE_URL = publicSiteOrigin();

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [...MARKETING_PUBLIC_PATHS, "/login", "/signup"],
        disallow: [
          "/api/",
          "/pipeline",
          "/leads",
          "/queue",
          "/workflows",
          "/scorecard",
          "/settings",
          "/team",
          "/intake",
          "/tv/",
          "/portal",
          "/platform",
          "/auth/",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
