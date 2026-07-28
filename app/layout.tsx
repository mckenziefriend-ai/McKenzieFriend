import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ConsentProvider from "./components/consent/ConsentProvider";
import CookieBanner from "./components/consent/CookieBanner";
import ConsentedAnalytics from "./components/consent/ConsentedAnalytics";
import SiteFooter from "./components/SiteFooter";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "McKenzieFriend.ai",
  description: "AI preparation for Family & Civil Court. Independent McKenzie Friend support.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ConsentProvider>
          {children}
          <SiteFooter />
          <CookieBanner />
          {/* Renders nothing unless NEXT_PUBLIC_GA_ID is set AND consent was given. */}
          <ConsentedAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
        </ConsentProvider>
      </body>
    </html>
  );
}
