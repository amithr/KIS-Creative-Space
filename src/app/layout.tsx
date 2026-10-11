import type { Metadata } from "next";
import {
  Cormorant_Garamond,
  IBM_Plex_Mono,
  Space_Grotesk,
  Space_Mono,
} from "next/font/google";
import { ConfirmProvider } from "@/components/ConfirmDialog";
import "./globals.css";
import "./(student)/students.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin", "latin-ext", "vietnamese"],
  weight: ["300", "400", "500", "600", "700"],
});

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
      className={`${spaceGrotesk.variable} ${spaceMono.variable} ${plexMono.variable} ${cormorant.variable} h-full`}
    >
      <body className="min-h-full font-sans">
        <ConfirmProvider>
          <main>{children}</main>
        </ConfirmProvider>
      </body>
    </html>
  );
}
