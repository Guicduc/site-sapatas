import { CartProvider } from "@/components/cart-provider";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { brand, siteUrl } from "@/lib/site-data";

import "./globals.css";

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${brand.name} | Sapatas 3D sob demanda para mobiliário`,
    template: `%s | ${brand.name}`
  },
  description: brand.description,
  applicationName: brand.name,
  alternates: {
    canonical: "/"
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: brand.name,
    title: `${brand.name} | Sapatas 3D sob demanda para mobiliário`,
    description: brand.description,
    url: siteUrl,
    images: [
      {
        url: "/brand/traco-base-og.png",
        width: 1200,
        height: 630,
        alt: "Sapatas 3D sob demanda Traço Base"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: `${brand.name} | Sapatas 3D sob demanda para mobiliário`,
    description: brand.description,
    images: ["/brand/traco-base-og.png"]
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>
        <CartProvider>
          <div className="page-background" aria-hidden="true" />
          <div className="site-shell">
            <SiteHeader />
            <main className="site-main">{children}</main>
            <SiteFooter />
          </div>
        </CartProvider>
      </body>
    </html>
  );
}
