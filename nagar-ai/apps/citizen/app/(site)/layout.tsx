import Footer from "@/components/Footer";
import NavBar from "@/components/NavBar";

export default function SiteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen flex-col">
      <NavBar />
      {/* Centered shell for citizen pages only; the admin console lives
          outside this group so it can use the full laptop width. */}
      <div className="mx-auto w-full max-w-3xl grow px-4 py-8 sm:py-10">{children}</div>
      <Footer />
    </div>
  );
}
