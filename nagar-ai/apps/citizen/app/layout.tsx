import type { Metadata } from "next";
import { Inter, Space_Grotesk, IBM_Plex_Mono } from "next/font/google";

import Footer from "@/components/Footer";
import NavBar from "@/components/NavBar";

import "./globals.css";

const display = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-display",
});

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Nagar AI — Report an Issue",
  description:
    "Report civic infrastructure issues like potholes, garbage, and water leakage to your municipality.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body className="flex min-h-screen flex-col bg-paper font-sans text-ink">
        <NavBar />
        {/* Centered shell for all pages; list pages use this width directly,
            form/auth pages constrain themselves narrower inside it. */}
        <div className="mx-auto w-full max-w-3xl grow px-4 py-8 sm:py-10">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
