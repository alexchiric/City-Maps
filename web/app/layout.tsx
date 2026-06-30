import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Single source of truth for <html lang> — flip to "ro" to switch, also
// drives the matching openGraph.locale below.
const LOCALE = "en";
const OG_LOCALE: Record<string, string> = { en: "en_US", ro: "ro_RO" };

const SITE_NAME = "City-Maps";
const DESCRIPTION = "Bucharest neighbourhood livability scores over OpenStreetMap data.";

// CRITICAL: must be set to the deployed Vercel URL (e.g. as a Vercel project
// env var). Without it, og:image resolves to a relative path and link
// previews break — Slack/iMessage/LinkedIn etc. all require an absolute URL.
// Falls back to localhost for local dev only.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Bucharest neighbourhood livability`,
    template: `%s · ${SITE_NAME}`,
  },
  description: DESCRIPTION,
  keywords: [
    "Bucharest",
    "livability",
    "neighborhood score",
    "urban planning",
    "OpenStreetMap",
    "city map",
    "GIS",
  ],
  // No openGraph.images / twitter.images here on purpose: the
  // opengraph-image.tsx / twitter-image.tsx file conventions already inject
  // those automatically. Adding them here too would produce duplicate tags.
  openGraph: {
    title: `${SITE_NAME} — Bucharest neighbourhood livability`,
    description: DESCRIPTION,
    url: "/",
    siteName: SITE_NAME,
    locale: OG_LOCALE[LOCALE],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — Bucharest neighbourhood livability`,
    description: DESCRIPTION,
  },
};

export const viewport: Viewport = {
  // Two values, media-matched: this is OS-level browser chrome theming
  // (e.g. mobile status bar tint), driven by prefers-color-scheme — separate
  // from the in-app manual light/dark toggle, which JS can't reach this with.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang={LOCALE}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      // The inline script below adds "dark" to this element before React
      // hydrates, so its className will legitimately differ from what SSR
      // rendered — expected with this pattern (same as the next-themes
      // package), not a real mismatch to warn about.
      suppressHydrationWarning
    >
      <body className="flex h-screen flex-col overflow-hidden">
        {/* Runs synchronously before paint, so the dark class (if applicable) is
            set before anything renders — avoids a flash of the wrong theme.
            Same approach as the next-themes package, done by hand to skip the
            dependency for a single inline script. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var s=localStorage.getItem("theme");var dark=s==="dark"||(s!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);if(dark)document.documentElement.classList.add("dark");})();`,
          }}
        />
        {children}
      </body>
    </html>
  );
}
