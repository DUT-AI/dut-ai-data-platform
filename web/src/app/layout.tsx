import type { Metadata } from "next";
import NextTopLoader from "nextjs-toploader";
import Providers from "./providers";
import { cn } from "@/lib/utils";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "DUT AI Data Platform",
    template: "%s | DUT AI Data Platform",
  },
  description:
    "Không gian quản trị dữ liệu, ontology và quy trình gán nhãn cho các dự án AI tại DUT.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
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
