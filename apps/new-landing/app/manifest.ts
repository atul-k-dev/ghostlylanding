import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE.name,
    short_name: SITE.shortName,
    description: SITE.cardDescription,
    start_url: "/",
    display: "standalone",
    background_color: "#e5f3f7",
    theme_color: "#e5f3f7",
    icons: [
      { src: "/logo.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
