import { siteUrl } from "../lib/site-data.js";

export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // /carrinho, /conta e /pedido-confirmado ficam liberados para o robo ler o
        // noindex declarado no metadata dessas paginas.
        disallow: ["/admin", "/api", "/demonstracao"]
      }
    ],
    sitemap: `${siteUrl}/sitemap.xml`
  };
}
