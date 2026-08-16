import type { MetadataRoute } from "next";

import { MARKETING_SITEMAP_PATHS } from "@/lib/marketing/public-paths";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://vesperwisecrm.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const marketing = MARKETING_SITEMAP_PATHS.map((path, index) => ({
    url: `${SITE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: path === "/home" ? 1 : index === 1 ? 0.8 : 0.6,
  }));

  return [
    ...marketing,
    {
      url: `${SITE_URL}/login`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];
}
