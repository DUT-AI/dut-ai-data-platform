"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Agentation } from "agentation";
import { useState } from "react";
import { AuthProvider } from "@/contexts/auth-context";
import { UploadProvider } from "@/contexts/upload-context";

export default function Providers({ children }: { children: React.ReactNode }) {
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

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <UploadProvider>{children}</UploadProvider>
      </AuthProvider>
      {process.env.NODE_ENV === "development" && <Agentation />}
    </QueryClientProvider>
  );
}

