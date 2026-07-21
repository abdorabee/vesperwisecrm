import type { MetadataRoute } from "next";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://vesperwisecrm.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/home", "/login"],
        disallow: [
          "/api/",
          "/pipeline",
          "/leads",
          "/queue",
          "/sequences",
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
