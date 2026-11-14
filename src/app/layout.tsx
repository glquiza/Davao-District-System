import type { Metadata } from "next";
import { GsapButtonEnhancer } from "@/components/gsap/GsapButtonEnhancer";
import "./globals.css";

export const metadata: Metadata = {
  title: "Davao District System — PMCC (4th Watch)",
  description:
    "Centralized Web-Based Church Programs, Activities, and Membership Management for Davao District",
  manifest: "/manifest.json",
  icons: {
    icon: "/pmcc-logo.png",
    apple: "/pmcc-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400..700;1,9..40,400..700&family=Playfair+Display:ital,wght@0,500..700;1,500..700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen flex flex-col bg-[#F5F1E9] text-[#202820] font-sans antialiased selection:bg-[#D6C6A5]/40 selection:text-[#202820]">
        <GsapButtonEnhancer />
        {children}
      </body>
    </html>
  );
}
