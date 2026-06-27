import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lead Insights Dashboard",
  description: "Vercel-ready dashboard and API for event lead performance analysis."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
