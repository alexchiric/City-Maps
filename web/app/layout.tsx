import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "City-Maps — Livability",
  description: "Neighborhood livability scores over OpenStreetMap data",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
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
