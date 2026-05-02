"use client";

import { SessionProvider } from "next-auth/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster } from "sonner";
import { ThemeProvider } from "./theme-provider";
import { ConfirmProvider } from "./ui/confirm-dialog";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <ConfirmProvider>
            {children}
            <Toaster
              position="top-right"
              richColors
              closeButton
              toastOptions={{
                style: {
                  borderRadius: "16px",
                  fontFamily: "inherit",
                },
              }}
            />
          </ConfirmProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}
