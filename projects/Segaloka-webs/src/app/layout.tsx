import { Footer } from "@/components/home/Footer";
import { Header } from "@/components/home/Header";
import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { MarketplacePreferencesProvider } from "@/components/providers/MarketplacePreferencesProvider";
import "./globals.css";
import "./promo-final.css";
import "./segaloka-system.css";
import "./hero-canonical.css";
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jakarta",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Segaloka — Perjalanan Lebih Mudah",
  description:
    "Umrah, Haji, Halal Tour, Tour Domestic dan Tour International dalam satu platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className={jakarta.variable}>
        <MarketplacePreferencesProvider>
          <div className="sg-global-site">
          <Header />

          <div className="sg-global-content">
            {children}
          </div>

          <Footer />
        </div>
        </MarketplacePreferencesProvider>
      </body>
    </html>
  );
}







