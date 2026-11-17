import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lični panel",
  description: "Komunikacija i organizacija vremena na jednom mjestu",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="bs">
      <body className="antialiased">{children}</body>
    </html>
  );
}
