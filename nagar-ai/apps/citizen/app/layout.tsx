import type { Metadata } from "next";
import { Inter } from "next/font/google";

import NavBar from "@/components/NavBar";

import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

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
    <html lang="en">
      <body className={inter.className}>
        <NavBar />
        {children}
      </body>
    </html>
  );
}
