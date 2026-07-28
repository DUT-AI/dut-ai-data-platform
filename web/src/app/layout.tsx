import type { Metadata } from "next";
import NextTopLoader from "nextjs-toploader";
import Providers from "./providers";
import { cn } from "@/lib/utils";
import "./globals.css";

export const metadata: Metadata = {
  title: "Project Boilerplate",
  description: "A clean Next.js frontend boilerplate.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn("h-full antialiased")}
      suppressHydrationWarning
    >
      <body className="min-h-full" suppressHydrationWarning>
        <NextTopLoader color="#2563eb" height={3} showSpinner={false} />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
