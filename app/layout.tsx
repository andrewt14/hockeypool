import type { Metadata, Viewport } from "next";
import { Geist, Barlow_Condensed } from "next/font/google";
import "./globals.css";
import { getTeams } from "@/lib/db";
import Shell from "@/components/Shell";

// Every page reads live pool data.
export const dynamic = "force-dynamic";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const barlow = Barlow_Condensed({ variable: "--font-barlow", subsets: ["latin"], weight: ["600", "700", "800"] });

export const metadata: Metadata = {
  title: "Puck Pool",
  description: "Our NHL fantasy pool",
  // Home-screen web app on iOS: full screen, content runs under a translucent status bar.
  appleWebApp: { capable: true, title: "Puck Pool", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
};
export const viewport: Viewport = { themeColor: "#070d1a", viewportFit: "cover", colorScheme: "dark" };

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const teams = await getTeams();
  return (
    <html lang="en" className={`${geist.variable} ${barlow.variable} antialiased`}>
      <body className="min-h-dvh font-sans">
        <Shell teams={teams}>{children}</Shell>
      </body>
    </html>
  );
}
