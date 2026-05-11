import type { Metadata, Viewport } from "next";
import { ServiceWorkerRegistration } from "@/components/mobile/service-worker-registration";
import { strings } from "@/lib/strings";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#196b75",
};

export const metadata: Metadata = {
  title: strings.app.name,
  description: strings.app.tagline,
  applicationName: strings.app.name,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Bella",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      {
        url: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground antialiased">
        <ServiceWorkerRegistration />
        {children}
      </body>
    </html>
  );
}
