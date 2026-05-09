import type { Metadata, Viewport } from "next";
import { Cairo, Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";
import { PwaRegister } from "@/components/erp/pwa-register";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "ERP Pro - نظام إدارة موارد المؤسسات",
  description: "نظام إدارة موارد المؤسسات المتكامل - ERP Pro",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: "/logo.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${cairo.variable} antialiased bg-background text-foreground font-sans`}
      >
        <Providers>
          {children}
          <PwaRegister />
        </Providers>
        <Toaster
          position="top-left"
          dir="rtl"
          richColors
          closeButton
          toastOptions={{
            className: 'font-sans',
            style: {
              direction: 'rtl',
              textAlign: 'right',
            },
          }}
        />
      </body>
    </html>
  );
}
