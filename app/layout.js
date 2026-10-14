import { CartProvider } from "@/components/cart-provider";
import { CookiePreferences } from "@/components/cookie-preferences";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { defaultOgImage, defaultSiteTitle, siteOpenGraph } from "@/lib/page-metadata";
import { brand, siteUrl } from "@/lib/site-data";
import { Barlow_Condensed } from "next/font/google";
import { DemoBanner } from "@/components/demo-banner";

import "./globals.css";

const brandDisplay = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-brand-display",
  display: "swap"
});

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: defaultSiteTitle,
    template: `%s | ${brand.name}`
  },
  description: brand.description,
  applicationName: brand.name,
  verification: process.env.GOOGLE_SITE_VERIFICATION
    ? {
        google: process.env.GOOGLE_SITE_VERIFICATION
      }
    : undefined,
  icons: {
    icon: "/brand/baseforma-mark.png",
    apple: "/brand/baseforma-mark.png"
  },
  // Sem canonical nem og:url aqui: o layout raiz e herdado por todas as rotas, entao cada
  // pagina indexavel declara os seus via buildPageMetadata (lib/page-metadata.js).
  openGraph: {
    ...siteOpenGraph,
    title: defaultSiteTitle,
    description: brand.description
  },
  twitter: {
    card: "summary_large_image",
    title: defaultSiteTitle,
    description: brand.description,
    images: [defaultOgImage.url]
  }
};

export default async function RootLayout({ children }) {
  return (
    <html lang="pt-BR" data-scroll-behavior="smooth">
      <body className={brandDisplay.variable}>
        <CartProvider>
          <div className="page-background" aria-hidden="true" />
          <div className="site-shell">
            <DemoBanner />
            <SiteHeader />
            <main className="site-main">{children}</main>
            <SiteFooter />
          </div>
          <CookiePreferences />
        </CartProvider>
      </body>
    </html>
  );
}
