import type { Metadata } from "next";
import { Cormorant_Garamond, IBM_Plex_Mono, Space_Mono } from "next/font/google";
import "./globals.css";
import "./(student)/students.css";

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin", "latin-ext", "vietnamese"],
  weight: ["400", "700"],
});

// Space Mono has no Cyrillic glyphs; Plex Mono steps in per-glyph at a
// matching size so "ДЛЯ УЧНІВ" sits on the same line as "FOR STUDENTS".
const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["cyrillic", "latin"],
  weight: ["400", "700"],
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin", "latin-ext", "cyrillic"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "KIS Creativity Space · For students",
  description:
    "Request 3D prints, vinyl posters and die-cut stickers from the KIS Creativity Space and track your jobs.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${spaceMono.variable} ${plexMono.variable} ${cormorant.variable} h-full`}
    >
      <body className="min-h-full font-sans">
        <main>{children}</main>
      </body>
    </html>
  );
}
