import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "VesperWise CRM",
    short_name: "VesperWise",
    description:
      "Acquisition-pipeline CRM: lead intake, qualification, and follow-up from any device.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f7f2",
    theme_color: "#f7f7f2",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
