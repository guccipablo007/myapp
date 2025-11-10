import type { Metadata } from "next";
import "./globals.css";

// Use relative paths so we don’t depend on tsconfig path aliases
import AppSidebar from "../components/AppSidebar";
import TopBar from "../components/TopBar";

export const metadata: Metadata = {
  title: "CAMSU Admin",
  description: "Community admin panel",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#0B0E16] text-white">
        <div className="flex">
          <AppSidebar />
          <div className="flex-1 min-h-screen ml-60">
            <TopBar />
            <main className="px-5 md:px-7 pb-12">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
