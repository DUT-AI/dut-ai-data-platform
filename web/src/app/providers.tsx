"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { AuthProvider } from "@/contexts/auth-context";

async function initMocks() {
  if (process.env.NEXT_PUBLIC_API_MOCKING !== "enabled") return;
  if (typeof window === "undefined") return;
  const { worker } = await import("@/mocks/browser");
  return worker.start({
    onUnhandledRequest: "bypass", // forward unmocked requests bình thường
  });
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const [mockReady, setMockReady] = useState(
    process.env.NEXT_PUBLIC_API_MOCKING !== "enabled"
  );

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_API_MOCKING === "enabled") {
      initMocks().then(() => setMockReady(true));
    }
  }, []);

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
          },
        },
      })
  );

  if (!mockReady) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
}

