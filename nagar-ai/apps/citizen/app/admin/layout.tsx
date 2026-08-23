"use client";

import AuthGate from "@/components/admin/AuthGate";
import Header from "@/components/admin/Header";
import Sidebar from "@/components/admin/Sidebar";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthGate>
      <div className="min-h-screen">
        <Sidebar />
        <div className="pl-60">
          <Header />
          <main className="px-6 py-6">{children}</main>
        </div>
      </div>
    </AuthGate>
  );
}
