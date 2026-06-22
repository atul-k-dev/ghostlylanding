import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ghostly247",
    short_name: "Ghostly247",
    description:
      "The friendly little ghost that grows your Twitter / X presence while you sleep.",
    start_url: "/",
    display: "standalone",
    background_color: "#0e0e0e",
    theme_color: "#0e0e0e",
    icons: [
      {
        src: "/logo.png",
        sizes: "any",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
