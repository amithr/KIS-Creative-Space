import type { Metadata } from "next";
import { Space_Grotesk, Space_Mono } from "next/font/google";
import { ConfirmProvider } from "@/components/ConfirmDialog";
import { Header } from "@/components/Header";
import "./globals.css";

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

export const metadata: Metadata = {
  title: "KIS Design Studio",
  description:
    "School makerspace resources, room schedule, and inventory for KIS Design Studio.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${spaceMono.variable} h-full`}
    >
      <body className="min-h-full font-sans">
        <ConfirmProvider>
          <Header />
          <main>{children}</main>
        </ConfirmProvider>
      </body>
    </html>
  );
}
