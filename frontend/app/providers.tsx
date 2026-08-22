"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { WalletProvider } from "@/lib/genlayer/WalletProvider";
import { DemoProvider } from "@/lib/demo/DemoProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 3000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <WalletProvider>
        <DemoProvider>{children}</DemoProvider>
      </WalletProvider>
      <Toaster
        position="top-right"
        theme="light"
        richColors
        closeButton
        offset="80px"
        toastOptions={{
          style: {
            background: "var(--card)",
            border: "1px solid var(--border)",
            color: "var(--foreground)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
          },
        }}
      />
    </QueryClientProvider>
  );
}