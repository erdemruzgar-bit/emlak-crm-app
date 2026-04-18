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
      {/* Arka plan görseli ThemeProvider tarafından -z-20'de render edilir.
          Layout kendisi saydam kalır; arka plan yoksa body'nin bg-background rengi görünür. */}
      <div className="min-h-screen flex relative">
        <Sidebar />
        <div className="flex-1 ml-64 flex flex-col min-h-screen">
          <Header />
          <main className="flex-1 p-8">{children}</main>
        </div>
      </div>
    </Providers>
  );
}
