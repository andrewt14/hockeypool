import { ImageResponse } from "next/og";

// Home-screen icon for "Add to Home Screen" on iOS. iOS rounds the corners itself.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#070d1a" }}>
        <div style={{ width: 118, height: 118, borderRadius: 59, background: "#e63946", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 58, fontWeight: 800, letterSpacing: -3 }}>
          PP
        </div>
      </div>
    ),
    size,
  );
}
