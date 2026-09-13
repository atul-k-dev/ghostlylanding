import type { MetadataRoute } from "next";
import { ROUTES, SITE_URL } from "@/lib/site";

/** Walks the same route list the footer links from, so the two cannot drift. */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return ROUTES.map((r) => ({
    url: r.path === "/" ? SITE_URL : `${SITE_URL}${r.path}`,
    lastModified,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
}
