import type { MetadataRoute } from "next";

// Lets "Add to Home Screen" open full-screen like an app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Puck Pool",
    short_name: "Puck Pool",
    start_url: "/",
    display: "standalone",
    background_color: "#070d1a",
    theme_color: "#070d1a",
    icons: [{ src: "/apple-icon", sizes: "180x180", type: "image/png" }],
  };
}
