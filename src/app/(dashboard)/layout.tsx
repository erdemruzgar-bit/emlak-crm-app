import Sidebar from "@/components/ui/sidebar";
import Header from "@/components/ui/header";
import Providers from "@/components/providers";
import { KeyboardShortcuts } from "@/components/ui/keyboard-shortcuts";

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
        <div className="flex-1 lg:ml-64 flex flex-col min-h-screen min-w-0">
          <Header />
          <main className="flex-1 p-4 sm:p-6 lg:p-8">
            {/* 4K+ ekranlarda içeriği max-w-screen-2xl ile sınırla, ortala — okunabilirlik için */}
            <div className="max-w-screen-2xl mx-auto w-full">{children}</div>
          </main>
        </div>
      </div>
      <KeyboardShortcuts />
    </Providers>
  );
}
