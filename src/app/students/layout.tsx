import type { Metadata } from "next";
import { Cormorant_Garamond } from "next/font/google";
import { StudentShell } from "@/components/students/StudentShell";
import "./students.css";

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

export default function StudentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`kis-students ${cormorant.variable}`}>
      <StudentShell>{children}</StudentShell>
    </div>
  );
}
