import Sidebar from "@/components/ui/sidebar";
import Header from "@/components/ui/header";
import Providers from "@/components/providers";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Providers>
      <div className="min-h-screen flex bg-background">
        <Sidebar />
        <div className="flex-1 ml-64 flex flex-col min-h-screen">
          <Header />
          <main className="flex-1 p-8">{children}</main>
        </div>
      </div>
    </Providers>
  );
}
